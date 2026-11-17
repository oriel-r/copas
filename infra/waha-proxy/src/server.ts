import { Hono, type Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import {
  loadSessionsConfig,
  loadTemplatesConfig,
  resolveSessionForPhoneNumberId,
  type ProxyConfig,
} from './config.ts'
import type { ProxyStore } from './db/store.ts'
import {
  buildOutboundAction,
  MetaApiError,
  normalizePhoneDigits,
  toWahaChatId,
} from './messages/builder.ts'
import {
  getProxyLogger,
  proxyRequestLoggerMiddleware,
  setupProxyLogger,
} from './observability/logger.ts'
import {
  timingSafeCompareStrings,
  verifyBearerToken,
  verifyWahaWebhookHmac,
} from './security/auth.ts'
import type { MetaSendMessageRequest, WahaWebhookEvent } from './types.ts'
import { WahaClient, WahaRequestError } from './waha/client.ts'
import type { WebhookEmulator } from './webhooks/emulator.ts'
import type { HumanDispatcher } from './worker/human-dispatcher.ts'

const MAX_BODY_BYTES = 1024 * 1024 // 1 MiB
const META_VERSION_RE = /^v\d+\.\d+$/

export type ProxyAppDeps = {
  config: ProxyConfig
  store: ProxyStore
  waha: WahaClient
  dispatcher: HumanDispatcher
  webhooks: WebhookEmulator
}

function metaErrorBody(code: number, type: string, message: string) {
  return {
    error: {
      message,
      type,
      code,
    },
  }
}

function checkExtraSecret(c: Context, config: ProxyConfig): boolean {
  if (!config.proxyExtraSecret) return true
  const providedExtra = c.req.header('x-proxy-secret')
  return Boolean(providedExtra && timingSafeCompareStrings(providedExtra, config.proxyExtraSecret))
}

function parseLimitQuery(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function createProxyApp(deps: ProxyAppDeps): Hono {
  const { config, store, waha, dispatcher, webhooks } = deps
  setupProxyLogger({ level: config.logLevel, format: config.logFormat })
  const logger = getProxyLogger('http')
  const app = new Hono()

  app.use('*', proxyRequestLoggerMiddleware())
  app.use(
    '*',
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) =>
        c.json(metaErrorBody(100, 'OAuthException', 'Payload too large'), 413),
    }),
  )

  app.get('/health', (c) => {
    return c.json({ status: 'ok', service: 'waha-proxy' })
  })

  app.get('/observability/status', async (c) => {
    if (!checkExtraSecret(c, config) || !verifyBearerToken(c.req.header('authorization'), config.proxyBearerTokens)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const wahaStatus = await waha.listSessions()
    return c.json({
      service: 'waha-proxy',
      timestamp: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
      queue: store.getQueueStats(),
      workers: dispatcher.getWorkerRuntimeState(),
      waha: wahaStatus,
      config: {
        checkNumberExists: config.wahaCheckNumberExists,
        disconnectedSessionHttpStatus: config.disconnectedSessionHttpStatus,
        webhookTargetConfigured: Boolean(config.copasWebhookUrl),
        humanTiming: {
          minCooldownMs: config.humanMinCooldownMs,
          maxCooldownMs: config.humanMaxCooldownMs,
          typingMsPerChar: config.humanTypingMsPerChar,
          minTypingMs: config.humanMinTypingMs,
          maxTypingMs: config.humanMaxTypingMs,
        },
      },
    })
  })

  app.get('/observability/jobs', (c) => {
    if (!checkExtraSecret(c, config) || !verifyBearerToken(c.req.header('authorization'), config.proxyBearerTokens)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const status = c.req.query('status') || undefined
    const wahaSession = c.req.query('session') || undefined
    const limit = parseLimitQuery(c.req.query('limit'))

    const items = store.listJobs({ status, wahaSession, limit })
    return c.json({ count: items.length, items })
  })

  app.get('/observability/events', (c) => {
    if (!checkExtraSecret(c, config) || !verifyBearerToken(c.req.header('authorization'), config.proxyBearerTokens)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const wamid = c.req.query('wamid') || undefined
    const wahaSession = c.req.query('session') || undefined
    const limit = parseLimitQuery(c.req.query('limit'))

    const items = store.listEvents({ wamid, wahaSession, limit })
    return c.json({ count: items.length, items })
  })

  app.post('/internal/waha-webhook', async (c) => {
    const rawBody = Buffer.from(await c.req.arrayBuffer())
    const sig = c.req.header('x-webhook-hmac')

    if (!verifyWahaWebhookHmac(rawBody, sig, config.wahaWebhookHmacKey)) {
      logger.warn('Rejected WAHA webhook with invalid HMAC signature')
      return c.json({ error: 'Invalid WAHA webhook HMAC signature' }, 401)
    }

    let event: WahaWebhookEvent
    try {
      event = JSON.parse(rawBody.toString('utf8')) as WahaWebhookEvent
    } catch {
      return c.json({ error: 'Invalid JSON payload' }, 400)
    }

    const result = await webhooks.handleWahaWebhook(event)
    return c.json({ ok: true, ...result }, 200)
  })

  app.post('/:version/:phoneNumberId/messages', async (c) => {
    const version = c.req.param('version')
    if (!META_VERSION_RE.test(version)) {
      return c.json({ error: 'Not Found' }, 404)
    }

    if (!checkExtraSecret(c, config)) {
      return c.json(metaErrorBody(190, 'OAuthException', 'Invalid proxy secret'), 401)
    }

    const phoneNumberId = c.req.param('phoneNumberId')
    const sessionsConfig = loadSessionsConfig(config.sessionsConfigPath)
    const sessionMapping = resolveSessionForPhoneNumberId(
      phoneNumberId,
      config,
      sessionsConfig,
    )

    const authHeader = c.req.header('authorization')
    const allowedTokens = sessionMapping?.bearerToken
      ? [sessionMapping.bearerToken]
      : config.proxyBearerTokens

    if (!verifyBearerToken(authHeader, allowedTokens)) {
      return c.json(metaErrorBody(190, 'OAuthException', 'Invalid OAuth access token.'), 401)
    }

    if (!sessionMapping) {
      return c.json(
        metaErrorBody(
          100,
          'GraphMethodException',
          `Unsupported post request. Object with ID '${phoneNumberId}' does not exist`,
        ),
        404,
      )
    }

    let payload: MetaSendMessageRequest
    try {
      payload = await c.req.json<MetaSendMessageRequest>()
    } catch {
      return c.json(metaErrorBody(100, 'OAuthException', 'Invalid JSON body'), 400)
    }

    const templatesConfig = loadTemplatesConfig(config.templatesConfigPath)
    const action = buildOutboundAction(payload, templatesConfig)
    const recipientDigits = normalizePhoneDigits(payload.to)

    const sessionInfo = await waha.getSession(sessionMapping.wahaSession)
    if (!sessionInfo || sessionInfo.status !== 'WORKING') {
      const statusLabel = sessionInfo?.status || 'NOT_FOUND'
      logger.warn(
        'WAHA session {wahaSession} not ready ({statusLabel}) for {phoneNumberId}',
        {
          wahaSession: sessionMapping.wahaSession,
          statusLabel,
          phoneNumberId,
        },
      )
      store.recordEvent({
        level: 'warning',
        category: 'http',
        wahaSession: sessionMapping.wahaSession,
        eventType: 'session_not_ready',
        message: `Rejected message: WAHA session status is ${statusLabel}`,
        details: { phoneNumberId, statusLabel, recipientPhone: recipientDigits },
      })
      return c.json(
        metaErrorBody(
          2,
          'APIException',
          `WAHA session '${sessionMapping.wahaSession}' is not ready (status: ${statusLabel})`,
        ),
        config.disconnectedSessionHttpStatus as ContentfulStatusCode,
      )
    }

    const jobId = crypto.randomUUID()
    const wamid = `wamid.waha.${jobId}`

    store.enqueueJob({
      id: jobId,
      wamid,
      phoneNumberId,
      wahaSession: sessionMapping.wahaSession,
      recipientPhone: recipientDigits,
      chatId: toWahaChatId(recipientDigits),
      action,
    })

    logger.info(
      'Enqueued outbound job {jobId} ({wamid}) for {recipientDigits} via session {wahaSession}',
      {
        jobId,
        wamid,
        recipientDigits,
        wahaSession: sessionMapping.wahaSession,
        phoneNumberId,
        actionType: action.kind,
      },
    )
    store.recordEvent({
      level: 'info',
      category: 'http',
      wahaSession: sessionMapping.wahaSession,
      wamid,
      jobId,
      eventType: 'job_enqueued',
      message: `Enqueued ${action.kind} message to ${recipientDigits}`,
      details: { phoneNumberId, actionType: action.kind, recipientPhone: recipientDigits },
    })

    dispatcher.triggerSession(sessionMapping.wahaSession)

    return c.json(
      {
        messaging_product: 'whatsapp',
        contacts: [
          {
            input: payload.to,
            wa_id: recipientDigits,
          },
        ],
        messages: [
          {
            id: wamid,
          },
        ],
      },
      200,
    )
  })

  app.notFound((c) => c.json({ error: 'Not Found' }, 404))

  app.onError((err, c) => {
    if (err instanceof MetaApiError) {
      logger.warn('MetaApiError ({httpStatus}/{metaCode}): {message}', {
        httpStatus: err.httpStatus,
        metaCode: err.metaCode,
        message: err.message,
      })
      return c.json(
        metaErrorBody(err.metaCode, err.metaType, err.message),
        err.httpStatus as ContentfulStatusCode,
      )
    }
    if (err instanceof WahaRequestError) {
      logger.error('WahaRequestError ({status}/{metaCode}): {message}', {
        status: err.status,
        metaCode: err.metaCode,
        message: err.message,
      })
      return c.json(
        metaErrorBody(err.metaCode, 'APIException', err.message),
        err.status as ContentfulStatusCode,
      )
    }
    logger.error('Unhandled request error: {error}', {
      error: err?.message || String(err),
      stack: err?.stack,
    })
    return c.json(
      metaErrorBody(1, 'APIException', err?.message || 'Internal Server Error'),
      500,
    )
  })

  return app
}
