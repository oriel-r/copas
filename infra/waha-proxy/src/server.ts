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
  parseCookieHeader,
  signAdminSessionCookie,
  signQrInviteToken,
  timingSafeCompareStrings,
  verifyAdminSessionCookie,
  verifyBearerToken,
  verifyQrInviteToken,
  verifyWahaWebhookHmac,
} from './security/auth.ts'
import type { MetaSendMessageRequest, WahaWebhookEvent } from './types.ts'
import { WahaClient, WahaRequestError } from './waha/client.ts'
import type { WebhookEmulator } from './webhooks/emulator.ts'
import type { HumanDispatcher } from './worker/human-dispatcher.ts'
import {
  renderQrInviteErrorHtml,
  renderQrLoginHtml,
  renderQrPortalHtml,
} from './qr/portal-html.ts'

const MAX_BODY_BYTES = 1024 * 1024 // 1 MiB
const META_VERSION_RE = /^v\d+\.\d+$/
const ADMIN_COOKIE_NAME = 'waha_qr_admin'
const ADMIN_COOKIE_TTL_SEC = 8 * 60 * 60
const TUNNEL_PROXY_HEADERS = [
  'cf-connecting-ip',
  'cf-ray',
  'tailscale-funnel-request',
  'x-forwarded-for',
  'x-real-ip',
  'x-forwarded-host',
  'forwarded',
]

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

function isTokenAllowed(token: string | undefined, expectedTokens: string[]): boolean {
  if (!token || expectedTokens.length === 0) return false
  const trimmed = token.trim()
  if (!trimmed) return false
  return expectedTokens.some((expected) => Boolean(expected) && timingSafeCompareStrings(trimmed, expected))
}

function extractAdminTokenCandidate(c: Context): string {
  const headerToken = c.req.header('x-access-token')?.trim()
  if (headerToken) return headerToken
  const auth = c.req.header('authorization')?.trim()
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  const queryToken = c.req.query('token')?.trim()
  if (queryToken) return queryToken
  return ''
}

function extractRequestHostname(c: Context): string {
  const hostHeader = (c.req.header('host') || '').trim().toLowerCase()
  if (hostHeader) {
    if (hostHeader.startsWith('[')) {
      const endBracket = hostHeader.indexOf(']')
      if (endBracket > 0) return hostHeader.slice(1, endBracket)
    }
    const colonIdx = hostHeader.indexOf(':')
    return colonIdx >= 0 ? hostHeader.slice(0, colonIdx) : hostHeader
  }
  try {
    return new URL(c.req.url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function isLocalAdminRequest(c: Context, config: ProxyConfig): boolean {
  if (!config.qrAdminLocalOnly) {
    return true
  }
  for (const hdr of TUNNEL_PROXY_HEADERS) {
    if (c.req.header(hdr)?.trim()) {
      return false
    }
  }
  const hostname = extractRequestHostname(c)
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function verifyQrAdminAuth(c: Context, config: ProxyConfig): boolean {
  if (!config.enableQrPortal || !config.qrPortalToken) {
    return false
  }
  if (!isLocalAdminRequest(c, config)) {
    return false
  }
  const allowedAdmin = [config.qrPortalToken]
  if (verifyBearerToken(c.req.header('authorization'), allowedAdmin)) {
    return true
  }
  if (isTokenAllowed(c.req.header('x-access-token'), allowedAdmin)) {
    return true
  }
  if (isTokenAllowed(c.req.query('token'), allowedAdmin)) {
    return true
  }
  const cookieSecret = config.qrInviteSecret || config.qrPortalToken
  const cookieVal = parseCookieHeader(c.req.header('cookie'), ADMIN_COOKIE_NAME)
  return verifyAdminSessionCookie(cookieVal, cookieSecret)
}

function verifyQrSessionAccess(
  c: Context,
  config: ProxyConfig,
  session: string,
): {
  allowed: boolean
  role: 'admin' | 'invite' | null
  inviteToken?: string
  invalidInvite?: boolean
} {
  if (!config.enableQrPortal) {
    return { allowed: false, role: null }
  }

  const inviteCandidate = (c.req.query('invite') || c.req.header('x-qr-invite') || '').trim()
  if (inviteCandidate) {
    const secret = config.qrInviteSecret || config.qrPortalToken
    const verified = verifyQrInviteToken(inviteCandidate, session, secret)
    if (!verified.valid) {
      return { allowed: false, role: null, invalidInvite: true }
    }
    return { allowed: true, role: 'invite', inviteToken: inviteCandidate }
  }

  if (verifyQrAdminAuth(c, config)) {
    return { allowed: true, role: 'admin' }
  }

  return { allowed: false, role: null }
}

function buildAdminCookieHeader(c: Context, config: ProxyConfig): string {
  const secret = config.qrInviteSecret || config.qrPortalToken
  const value = signAdminSessionCookie({ ttlSeconds: ADMIN_COOKIE_TTL_SEC, secret })
  const isHttps =
    c.req.header('x-forwarded-proto')?.toLowerCase() === 'https' ||
    c.req.url.startsWith('https://')
  return `${ADMIN_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ADMIN_COOKIE_TTL_SEC}${isHttps ? '; Secure' : ''}`
}

function rejectNonAdminQr(c: Context, config: ProxyConfig) {
  const inviteAttempt = Boolean((c.req.query('invite') || c.req.header('x-qr-invite') || '').trim())
  if (!isLocalAdminRequest(c, config) || inviteAttempt || !config.qrPortalToken) {
    return c.json({ error: 'Forbidden: admin control panel requires local admin access' }, 403)
  }
  return c.json({ error: 'Unauthorized' }, 401)
}

function sanitizeSessionName(raw: string | undefined, fallback: string): string {
  const cleaned = (raw || '').trim().replace(/[^a-zA-Z0-9._-]/g, '')
  return cleaned || fallback
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

  const qrDisabledGuard = async (c: Context, next: () => Promise<void>) => {
    if (!config.enableQrPortal) {
      return c.json({ error: 'QR portal is disabled' }, 404)
    }
    await next()
  }

  app.use('/qr', qrDisabledGuard)
  app.use('/qr/*', qrDisabledGuard)

  const enqueueMetaOutbound = async (params: {
    phoneNumberId: string
    payload: MetaSendMessageRequest
    sessionMapping: NonNullable<ReturnType<typeof resolveSessionForPhoneNumberId>>
  }) => {
    const { phoneNumberId, payload, sessionMapping } = params
    const templatesConfig = loadTemplatesConfig(config.templatesConfigPath)
    const action = buildOutboundAction(
      payload,
      templatesConfig,
      sessionMapping.agencyName ? { agency_name: sessionMapping.agencyName } : undefined,
    )
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
      return {
        ok: false as const,
        status: config.disconnectedSessionHttpStatus as ContentfulStatusCode,
        body: metaErrorBody(
          2,
          'APIException',
          `WAHA session '${sessionMapping.wahaSession}' is not ready (status: ${statusLabel})`,
        ),
      }
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

    return {
      ok: true as const,
      status: 200 as const,
      body: {
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
    }
  }

  app.post('/qr/login', async (c) => {
    if (!isLocalAdminRequest(c, config)) {
      return c.json({ error: 'Forbidden: control panel is restricted to local access' }, 403)
    }
    const contentType = c.req.header('content-type') || ''
    let submittedToken = ''
    let targetSession = ''

    if (contentType.includes('application/json')) {
      const json = await c.req.json<{ token?: string; session?: string }>().catch(() => ({}))
      submittedToken = String((json as any).token || '')
      targetSession = String((json as any).session || '')
    } else {
      const form = (await c.req.parseBody().catch(() => ({}))) as Record<string, unknown>
      submittedToken = typeof form.token === 'string' ? form.token : ''
      targetSession = typeof form.session === 'string' ? form.session : ''
    }

    const session = targetSession ? sanitizeSessionName(targetSession, config.wahaDefaultSession) : ''
    if (!config.qrPortalToken || !isTokenAllowed(submittedToken, [config.qrPortalToken])) {
      return c.html(renderQrLoginHtml(session || config.wahaDefaultSession, true), 401)
    }

    c.header('Set-Cookie', buildAdminCookieHeader(c, config))
    const redirectPath = session ? `/qr?session=${encodeURIComponent(session)}` : '/qr'
    return c.redirect(redirectPath, 303)
  })

  app.post('/qr/logout-admin', (c) => {
    if (!isLocalAdminRequest(c, config)) {
      return c.json({ error: 'Forbidden: control panel is restricted to local access' }, 403)
    }
    c.header('Set-Cookie', `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
    return c.redirect('/qr', 303)
  })

  app.get('/qr', async (c) => {
    if (!isLocalAdminRequest(c, config)) {
      return c.json({ error: 'Forbidden: control panel is restricted to local access' }, 403)
    }
    const sessionsConfig = loadSessionsConfig(config.sessionsConfigPath)
    const defaultSession = sanitizeSessionName(
      c.req.query('session') ||
        sessionsConfig.sessions?.default?.wahaSession ||
        config.wahaDefaultSession,
      'default',
    )
    if (!verifyQrAdminAuth(c, config)) {
      const attempted = Boolean(extractAdminTokenCandidate(c) || c.req.query('invite'))
      return c.html(renderQrLoginHtml(defaultSession, attempted), attempted ? 401 : 200)
    }

    if (c.req.query('token')) {
      c.header('Set-Cookie', buildAdminCookieHeader(c, config))
    }

    const wahaStatus = await waha.listSessions()
    return c.html(
      renderQrPortalHtml({
        mode: 'admin',
        activeSession: defaultSession,
        sessionsConfig,
        liveSessions: wahaStatus.sessions,
        defaultInviteMinutes: Math.round(config.qrInviteDefaultTtlSec / 60),
        publicBaseUrl: config.qrPublicBaseUrl,
      }),
    )
  })

  app.post('/qr/sync-status', async (c) => {
    if (!verifyQrAdminAuth(c, config)) {
      return rejectNonAdminQr(c, config)
    }
    const summary = await webhooks.syncAllSessionsStatus(waha)
    return c.json({ ok: true, ...summary })
  })

  app.get('/qr/:session', async (c) => {
    const session = sanitizeSessionName(c.req.param('session'), config.wahaDefaultSession)
    const access = verifyQrSessionAccess(c, config, session)
    if (!access.allowed) {
      if (access.invalidInvite || !isLocalAdminRequest(c, config)) {
        return c.html(renderQrInviteErrorHtml(), 403)
      }
      const attempted = Boolean(extractAdminTokenCandidate(c))
      return c.html(renderQrLoginHtml(session, attempted), attempted ? 401 : 200)
    }

    if (access.role === 'admin') {
      if (c.req.query('token')) {
        c.header('Set-Cookie', buildAdminCookieHeader(c, config))
      }
      return c.html(
        renderQrPortalHtml({
          mode: 'qr',
          activeSession: session,
        }),
      )
    }

    return c.html(
      renderQrPortalHtml({
        mode: 'qr',
        activeSession: session,
        inviteToken: access.inviteToken,
      }),
    )
  })

  app.get('/qr/:session/status', async (c) => {
    const session = sanitizeSessionName(c.req.param('session'), config.wahaDefaultSession)
    const access = verifyQrSessionAccess(c, config, session)
    if (!access.allowed) {
      return c.json({ error: access.invalidInvite ? 'Forbidden: invalid or expired invite' : 'Unauthorized' }, access.invalidInvite ? 403 : 401)
    }

    const detail = await waha.getSessionDetail(session)
    if (access.role === 'admin') {
      const sessionsConfig = loadSessionsConfig(config.sessionsConfigPath)
      return c.json({ session, role: 'admin', detail, sessionsConfig })
    }
    return c.json({ session, role: 'invite', detail })
  })

  app.get('/qr/:session/image', async (c) => {
    const session = sanitizeSessionName(c.req.param('session'), config.wahaDefaultSession)
    const access = verifyQrSessionAccess(c, config, session)
    if (!access.allowed) {
      return c.json({ error: access.invalidInvite ? 'Forbidden: invalid or expired invite' : 'Unauthorized' }, access.invalidInvite ? 403 : 401)
    }
    const img = await waha.getSessionQrImage(session)
    return new Response(Buffer.from(img.data), {
      status: 200,
      headers: {
        'Content-Type': img.contentType,
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  })

  app.post('/qr/:session/start', async (c) => {
    const session = sanitizeSessionName(c.req.param('session'), config.wahaDefaultSession)
    const access = verifyQrSessionAccess(c, config, session)
    if (!access.allowed) {
      return c.json({ error: access.invalidInvite ? 'Forbidden: invalid or expired invite' : 'Unauthorized' }, access.invalidInvite ? 403 : 401)
    }
    const result = await waha.ensureSessionStarted(
      session,
      'http://waha-proxy:8080/internal/waha-webhook',
      config.wahaWebhookHmacKey,
    )
    logger.info('Panel ensured WAHA session {wahaSession} started ({status}, role={role})', {
      wahaSession: session,
      status: result.status,
      role: access.role,
    })
    void webhooks
      .emitChannelStatusWebhook({
        wahaSession: session,
        wahaStatus: result.status,
      })
      .catch(() => undefined)
    return c.json({ ok: true, session: result })
  })

  app.post('/qr/:session/restart', async (c) => {
    if (!verifyQrAdminAuth(c, config)) {
      return rejectNonAdminQr(c, config)
    }
    const session = sanitizeSessionName(c.req.param('session'), config.wahaDefaultSession)
    await waha.restartSession(session)
    void waha
      .getSessionDetail(session)
      .then((detail) =>
        detail
          ? webhooks.emitChannelStatusWebhook({
              wahaSession: session,
              wahaStatus: detail.status,
              meId: detail.me?.id,
            })
          : undefined,
      )
      .catch(() => undefined)
    return c.json({ ok: true, session })
  })

  app.post('/qr/:session/logout', async (c) => {
    if (!verifyQrAdminAuth(c, config)) {
      return rejectNonAdminQr(c, config)
    }
    const session = sanitizeSessionName(c.req.param('session'), config.wahaDefaultSession)
    await waha.logoutSession(session)
    void webhooks
      .emitChannelStatusWebhook({
        wahaSession: session,
        wahaStatus: 'STOPPED',
      })
      .catch(() => undefined)
    return c.json({ ok: true, session })
  })

  app.post('/qr/:session/pairing-code', async (c) => {
    if (!verifyQrAdminAuth(c, config)) {
      return rejectNonAdminQr(c, config)
    }
    const session = sanitizeSessionName(c.req.param('session'), config.wahaDefaultSession)
    const body = await c.req.json<{ phoneNumber?: string }>().catch(() => ({ phoneNumber: '' }))
    const phoneDigits = normalizePhoneDigits(body.phoneNumber || '')
    const res = await waha.requestPairingCode(session, phoneDigits)
    return c.json({ ok: true, phoneNumber: phoneDigits, ...res })
  })

  app.post('/qr/:session/invite', async (c) => {
    if (!verifyQrAdminAuth(c, config)) {
      return rejectNonAdminQr(c, config)
    }
    const secret = config.qrInviteSecret || config.qrPortalToken
    if (!secret) {
      return c.json({ error: 'QR_INVITE_SECRET is not configured' }, 500)
    }
    const session = sanitizeSessionName(c.req.param('session'), config.wahaDefaultSession)
    const body = await c.req.json<{ ttlMinutes?: number }>().catch(() => ({ ttlMinutes: undefined }))
    const ttlSeconds =
      typeof body.ttlMinutes === 'number' && Number.isFinite(body.ttlMinutes)
        ? Math.round(Math.max(1, Math.min(body.ttlMinutes, 120)) * 60)
        : config.qrInviteDefaultTtlSec

    const inviteToken = signQrInviteToken({ session, ttlSeconds, secret })
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
    logger.info('Issued scoped QR invite for session {wahaSession} expiring at {expiresAt}', {
      wahaSession: session,
      expiresAt,
      ttlSeconds,
    })
    return c.json({
      ok: true,
      session,
      inviteToken,
      invitePath: `/qr/${encodeURIComponent(session)}?invite=${encodeURIComponent(inviteToken)}`,
      expiresAt,
      ttlSeconds,
    })
  })

  app.post('/qr/:session/test-send', async (c) => {
    if (!verifyQrAdminAuth(c, config)) {
      return rejectNonAdminQr(c, config)
    }
    const sessionsConfig = loadSessionsConfig(config.sessionsConfigPath)
    let body: MetaSendMessageRequest & { phoneNumberId?: string }
    try {
      body = await c.req.json<MetaSendMessageRequest & { phoneNumberId?: string }>()
    } catch {
      return c.json(metaErrorBody(100, 'OAuthException', 'Invalid JSON body'), 400)
    }

    const phoneNumberId = (body.phoneNumberId || 'default').trim()
    const sessionMapping = resolveSessionForPhoneNumberId(phoneNumberId, config, sessionsConfig)
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

    const result = await enqueueMetaOutbound({
      phoneNumberId,
      payload: body,
      sessionMapping,
    })
    return c.json(result.body, result.status)
  })

  app.get('/qr/:session/events', (c) => {
    if (!verifyQrAdminAuth(c, config)) {
      return rejectNonAdminQr(c, config)
    }
    const wamid = c.req.query('wamid') || undefined
    const limit = parseLimitQuery(c.req.query('limit'))
    const items = store.listEvents({ wamid, limit })
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

    const result = await enqueueMetaOutbound({
      phoneNumberId,
      payload,
      sessionMapping,
    })
    return c.json(result.body, result.status)
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
