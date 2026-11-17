import { createHmac } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadProxyConfig,
  loadSessionsConfig,
  loadTemplatesConfig,
  resolvePhoneMetadataByWahaSession,
  resolveSessionForPhoneNumberId,
  type ProxyConfig,
} from './config.ts'
import { ProxyStore } from './db/store.ts'
import { buildOutboundAction, MetaApiError, normalizePhoneDigits, toWahaChatId } from './messages/builder.ts'
import {
  signMetaWebhookPayload,
  signQrInviteToken,
  verifyBearerToken,
  verifyQrInviteToken,
  verifyWahaWebhookHmac,
} from './security/auth.ts'
import { createProxyApp } from './server.ts'
import type { TemplatesConfigFile } from './types.ts'
import { WahaClient } from './waha/client.ts'
import { WebhookEmulator } from './webhooks/emulator.ts'
import { HumanDispatcher } from './worker/human-dispatcher.ts'

async function verifyMetaSignatureLikeWorker(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  const hex = signatureHeader.slice(7)
  if (hex.length !== 64) return false
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const sigBytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    sigBytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(rawBody))
}

function makeTempFixtures() {
  const dir = mkdtempSync(join(tmpdir(), 'copas-waha-proxy-test-'))
  const sessionsPath = join(dir, 'sessions.json')
  const templatesPath = join(dir, 'templates.json')

  writeFileSync(
    sessionsPath,
    JSON.stringify({
      allowDefaultSessionFallback: true,
      sessions: {
        default: {
          wahaSession: 'default',
          displayPhone: '5491100000000',
        },
        'agency-a-phone-id': {
          wahaSession: 'agencia-a',
          displayPhone: '5491122223333',
          bearerToken: 'agency-a-token',
        },
      },
    }),
  )

  const templates: TemplatesConfigFile = {
    templates: {
      recordatorio_vencimiento: {
        es_AR:
          'Hola {{customer_name}}, tu cuota (patente {{plate_number}}) vence el {{expiration_date}} por ${{amount}}.',
        default:
          'Hola {{customer_name}}, tu cuota (patente {{plate_number}}) vence el {{expiration_date}} por ${{amount}}.',
      },
      renovacion_poliza: {
        default:
          'Hola {{customer_name}}, la póliza de {{plate_number}} vence el {{expiration_date}}.',
      },
      posicional_ejemplo: {
        default: 'Hola {{1}}, vencimiento el {{2}}.',
      },
    },
  }
  writeFileSync(templatesPath, JSON.stringify(templates))

  return { dir, sessionsPath, templatesPath, templates }
}

function makeTestConfig(
  overrides: Partial<ProxyConfig> & { sessionsPath: string; templatesPath: string },
  envOverrides: Record<string, string | undefined> = {},
): ProxyConfig {
  return {
    ...loadProxyConfig({
      LOG_LEVEL: 'error',
      LOG_FORMAT: 'json',
      DB_PATH: ':memory:',
      SESSIONS_CONFIG_PATH: overrides.sessionsPath,
      TEMPLATES_CONFIG_PATH: overrides.templatesPath,
      WAHA_BASE_URL: 'http://waha.local:3000',
      WAHA_API_KEY: 'waha-api-secret',
      WAHA_DEFAULT_SESSION: 'default',
      WAHA_WEBHOOK_HMAC_KEY: 'waha-hmac-secret',
      PROXY_BEARER_TOKEN: 'global-bearer-token',
      ENABLE_QR_PORTAL: 'true',
      QR_PORTAL_TOKEN: 'qr-admin-token-test',
      QR_INVITE_SECRET: 'qr-invite-secret-test',
      COPAS_WEBHOOK_URL: 'https://whatsapp-service.test/webhooks/whatsapp',
      META_APP_SECRET: 'meta-app-secret-test',
      META_WABA_ID: 'waha-proxy-waba',
      DISCONNECTED_SESSION_HTTP_STATUS: '503',
      HUMAN_MIN_COOLDOWN_MS: '0',
      HUMAN_MAX_COOLDOWN_MS: '0',
      HUMAN_TYPING_MS_PER_CHAR: '0',
      HUMAN_MIN_TYPING_MS: '0',
      HUMAN_MAX_TYPING_MS: '0',
      MAX_SEND_RETRIES: '2',
      ...envOverrides,
    }),
    ...overrides,
  }
}

describe('waha-proxy security & signatures', () => {
  it('validates Bearer tokens in constant time', () => {
    expect(verifyBearerToken('Bearer my-secret', ['my-secret', 'other'])).toBe(true)
    expect(verifyBearerToken('bearer my-secret', ['my-secret'])).toBe(true)
    expect(verifyBearerToken('Bearer wrong', ['my-secret'])).toBe(false)
    expect(verifyBearerToken('Basic my-secret', ['my-secret'])).toBe(false)
    expect(verifyBearerToken(undefined, ['my-secret'])).toBe(false)
    expect(verifyBearerToken('Bearer ', ['my-secret'])).toBe(false)
  })

  it('verifies WAHA HMAC-SHA512 webhook signatures', () => {
    const body = JSON.stringify({ event: 'message', session: 'default' })
    const validHex = createHmac('sha512', 'waha-hmac-secret').update(body).digest('hex')

    expect(verifyWahaWebhookHmac(body, validHex, 'waha-hmac-secret')).toBe(true)
    expect(verifyWahaWebhookHmac(body, `sha512=${validHex}`, 'waha-hmac-secret')).toBe(true)
    expect(verifyWahaWebhookHmac(body, '0'.repeat(128), 'waha-hmac-secret')).toBe(false)
    expect(verifyWahaWebhookHmac(body, 'invalid', 'waha-hmac-secret')).toBe(false)
    expect(verifyWahaWebhookHmac(body, undefined, 'waha-hmac-secret')).toBe(false)
  })

  it('generates X-Hub-Signature-256 compatible with whatsapp-service WebCrypto verifier', async () => {
    const raw = JSON.stringify({ object: 'whatsapp_business_account', entry: [] })
    const sig = signMetaWebhookPayload(raw, 'meta-app-secret-test')

    expect(await verifyMetaSignatureLikeWorker(raw, sig, 'meta-app-secret-test')).toBe(true)
    expect(await verifyMetaSignatureLikeWorker(raw, sig, 'wrong-secret')).toBe(false)
  })
})

describe('waha-proxy message builder', () => {
  it('renders named parameters for recordatorio_vencimiento and renovacion_poliza', () => {
    const { dir, templates } = makeTempFixtures()
    try {
      const action = buildOutboundAction(
        {
          to: '+54 9 11 5555-1234',
          type: 'template',
          template: {
            name: 'recordatorio_vencimiento',
            language: { code: 'es_AR' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', parameter_name: 'customer_name', text: 'María Gómez' },
                  { type: 'text', parameter_name: 'plate_number', text: 'AF999ZZ' },
                  { type: 'text', parameter_name: 'expiration_date', text: '25/11/2026' },
                  { type: 'text', parameter_name: 'amount', text: '32.500,00' },
                ],
              },
            ],
          },
        },
        templates,
      )

      expect(action).toEqual({
        kind: 'text',
        text: 'Hola María Gómez, tu cuota (patente AF999ZZ) vence el 25/11/2026 por $32.500,00.',
      })

      const renewal = buildOutboundAction(
        {
          to: '5491155551234',
          type: 'template',
          template: {
            name: 'renovacion_poliza',
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', parameter_name: 'customer_name', text: 'Carlos' },
                  { type: 'text', parameter_name: 'plate_number', text: 'AB123CD' },
                  { type: 'text', parameter_name: 'expiration_date', text: '30/11/2026' },
                ],
              },
            ],
          },
        },
        templates,
      )
      expect(renewal).toEqual({
        kind: 'text',
        text: 'Hola Carlos, la póliza de AB123CD vence el 30/11/2026.',
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('supports positional template parameters, text, reaction, contacts and interactive', () => {
    const { dir, templates } = makeTempFixtures()
    try {
      expect(
        buildOutboundAction(
          {
            to: '5491112345678',
            type: 'template',
            template: {
              name: 'posicional_ejemplo',
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: 'Lucía' },
                    { type: 'date_time', date_time: { fallback_value: '01/12/2026' } },
                  ],
                },
              ],
            },
          },
          templates,
        ),
      ).toEqual({ kind: 'text', text: 'Hola Lucía, vencimiento el 01/12/2026.' })

      expect(
        buildOutboundAction(
          { to: '5491112345678', type: 'text', text: { body: 'Texto libre' } },
          templates,
        ),
      ).toEqual({ kind: 'text', text: 'Texto libre' })

      expect(
        buildOutboundAction(
          {
            to: '5491112345678',
            type: 'reaction',
            reaction: { message_id: 'wamid.waha.1', emoji: '👍' },
          },
          templates,
        ),
      ).toEqual({ kind: 'reaction', targetMessageId: 'wamid.waha.1', emoji: '👍' })

      const contactAction = buildOutboundAction(
        {
          to: '5491112345678',
          type: 'contacts',
          contacts: [
            {
              name: { formatted_name: 'PAS Broker' },
              phones: [{ phone: '+5491144445555' }],
            },
          ],
        },
        templates,
      )
      expect(contactAction.kind).toBe('contact')
      if (contactAction.kind === 'contact') {
        expect(contactAction.fallbackText).toContain('PAS Broker')
        expect(contactAction.fallbackText).toContain('+5491144445555')
      }

      const interactiveAction = buildOutboundAction(
        {
          to: '5491112345678',
          type: 'interactive',
          interactive: {
            type: 'button',
            header: { type: 'text', text: 'Confirmación' },
            body: { text: 'Elegí una opción' },
            action: {
              buttons: [
                { type: 'reply', reply: { id: '1', title: 'Pagar' } },
                { type: 'reply', reply: { id: '2', title: 'Hablar con asesor' } },
              ],
            },
          },
        },
        templates,
      )
      expect(interactiveAction).toEqual({
        kind: 'text',
        text: '*Confirmación*\n\nElegí una opción\n\n1. Pagar\n2. Hablar con asesor',
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects unknown templates and invalid phones with MetaApiError', () => {
    const { dir, templates } = makeTempFixtures()
    try {
      expect(() =>
        buildOutboundAction(
          {
            to: '5491112345678',
            type: 'template',
            template: { name: 'missing_tpl' },
          },
          templates,
        ),
      ).toThrowError(MetaApiError)

      expect(() =>
        buildOutboundAction(
          {
            to: '123',
            type: 'text',
            text: { body: 'hola' },
          },
          templates,
        ),
      ).toThrowError(MetaApiError)

      expect(normalizePhoneDigits('543704609703')).toBe('5493704609703')
      expect(normalizePhoneDigits('+54 9 370 460-9703')).toBe('5493704609703')
      expect(toWahaChatId('543704609703')).toBe('5493704609703@c.us')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('waha-proxy SQLite store & session mapping', () => {
  it('manages jobs lifecycle, stuck recovery, mappings and audit events', () => {
    const store = new ProxyStore(':memory:')
    try {
      store.enqueueJob({
        id: 'job-1',
        wamid: 'wamid.waha.job-1',
        phoneNumberId: 'agency-a-phone-id',
        wahaSession: 'agencia-a',
        recipientPhone: '5491155551234',
        chatId: '5491155551234@c.us',
        action: { kind: 'text', text: 'Hola' },
      })

      const claimed = store.claimNextQueuedJob('agencia-a')
      expect(claimed?.id).toBe('job-1')
      expect(claimed?.status).toBe('processing')
      expect(claimed?.attempts).toBe(1)

      // Simula reinicio abrupto mientras estaba en processing
      expect(store.resetStuckProcessingJobs()).toBe(1)
      const reclaimed = store.claimNextQueuedJob('agencia-a')
      expect(reclaimed?.attempts).toBe(2)

      store.markJobCompleted('job-1', 'true_5491155551234@c.us_ABC123')
      store.upsertMessageMapping({
        wamid: 'wamid.waha.job-1',
        wahaMessageId: 'true_5491155551234@c.us_ABC123',
        phoneNumberId: 'agency-a-phone-id',
        wahaSession: 'agencia-a',
        recipientPhone: '5491155551234',
      })

      expect(store.findMappingByWahaMessageId('true_5491155551234@c.us_ABC123')?.wamid).toBe(
        'wamid.waha.job-1',
      )
      expect(store.findMappingByWamid('wamid.waha.job-1')?.waha_message_id).toBe(
        'true_5491155551234@c.us_ABC123',
      )

      store.recordEvent({
        level: 'info',
        category: 'dispatcher',
        wahaSession: 'agencia-a',
        wamid: 'wamid.waha.job-1',
        jobId: 'job-1',
        eventType: 'waha_dispatched',
        message: 'Enviado ok',
        details: { ms: 42 },
      })

      const stats = store.getQueueStats()
      expect(stats.totals.completed).toBe(1)
      expect(stats.bySession['agencia-a']?.completed).toBe(1)
      expect(stats.mappingsCount).toBe(1)
      expect(stats.eventsCount).toBe(1)

      expect(store.listJobs({ wahaSession: 'agencia-a' })).toHaveLength(1)
      const events = store.listEvents({ wamid: 'wamid.waha.job-1' })
      expect(events).toHaveLength(1)
      expect(events[0].details).toEqual({ ms: 42 })
    } finally {
      store.close()
    }
  })

  it('maps multiple agency phoneNumberIds to isolated WAHA sessions', () => {
    const { dir, sessionsPath, templatesPath } = makeTempFixtures()
    try {
      const config = makeTestConfig({ sessionsPath, templatesPath })
      const sessionsConfig = loadSessionsConfig(sessionsPath)

      const agencyA = resolveSessionForPhoneNumberId('agency-a-phone-id', config, sessionsConfig)
      expect(agencyA).toEqual({
        phoneNumberId: 'agency-a-phone-id',
        wahaSession: 'agencia-a',
        displayPhone: '5491122223333',
        bearerToken: 'agency-a-token',
      })

      const reverse = resolvePhoneMetadataByWahaSession('agencia-a', config, sessionsConfig)
      expect(reverse).toEqual({
        phoneNumberId: 'agency-a-phone-id',
        displayPhone: '5491122223333',
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('waha-proxy HTTP Hono server, human dispatcher & webhook emulator', () => {
  let tmpDir: string
  let store: ProxyStore
  let config: ProxyConfig
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    const fx = makeTempFixtures()
    tmpDir = fx.dir
    config = makeTestConfig({
      sessionsPath: fx.sessionsPath,
      templatesPath: fx.templatesPath,
    })
    store = new ProxyStore(':memory:')
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    store.close()
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('enqueues Meta template request, runs human-behavior sequence on WAHA, and correlates ack/inbound webhooks', async () => {
    const wahaCalls: Array<{ url: string; method: string; body?: any }> = []
    const webhookCalls: Array<{ url: string; headers: Record<string, string>; rawBody: string }> = []

    fetchMock.mockImplementation(async (input: string | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method || 'GET').toUpperCase()
      const rawBody = typeof init?.body === 'string' ? init.body : ''

      if (url.startsWith('https://whatsapp-service.test/')) {
        const hdrs: Record<string, string> = {}
        if (init?.headers && typeof init.headers === 'object') {
          for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
            hdrs[k.toLowerCase()] = v
          }
        }
        webhookCalls.push({ url, headers: hdrs, rawBody })
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      }

      const parsedBody = rawBody ? JSON.parse(rawBody) : undefined
      wahaCalls.push({ url, method, body: parsedBody })

      if (url.endsWith('/api/sessions/agencia-a')) {
        return new Response(JSON.stringify({ name: 'agencia-a', status: 'WORKING' }), {
          status: 200,
        })
      }
      if (url.includes('/api/contacts/check-exists')) {
        return new Response(
          JSON.stringify({ numberExists: true, chatId: '5491155551234@c.us' }),
          { status: 200 },
        )
      }
      if (url.endsWith('/api/sendText')) {
        return new Response(
          JSON.stringify({ id: 'true_5491155551234@c.us_WAHA999' }),
          { status: 200 },
        )
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })

    const waha = new WahaClient(config.wahaBaseUrl, config.wahaApiKey)
    const webhooks = new WebhookEmulator(config, store)
    const dispatcher = new HumanDispatcher(config, store, waha, webhooks)
    const app = createProxyApp({ config, store, waha, dispatcher, webhooks })

    // 1. Unauthorized check
    const unauth = await app.request('/v20.0/agency-a-phone-id/messages', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer global-bearer-token', // agencia-a exige su token propio
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: '5491155551234', type: 'text', text: { body: 'Hola' } }),
    })
    expect(unauth.status).toBe(401)

    // 2. Valid Meta-compatible template request
    const sendRes = await app.request('/v20.0/agency-a-phone-id/messages', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer agency-a-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: '+54 9 11 5555-1234',
        type: 'template',
        template: {
          name: 'recordatorio_vencimiento',
          language: { code: 'es_AR' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', parameter_name: 'customer_name', text: 'Juan Pérez' },
                { type: 'text', parameter_name: 'plate_number', text: 'AB123CD' },
                { type: 'text', parameter_name: 'expiration_date', text: '20/11/2026' },
                { type: 'text', parameter_name: 'amount', text: '45.000,00' },
              ],
            },
          ],
        },
      }),
    })

    expect(sendRes.status).toBe(200)
    const sendJson = (await sendRes.json()) as any
    const wamid = sendJson.messages[0].id
    expect(wamid).toMatch(/^wamid\.waha\./)

    await dispatcher.waitIdle()

    // 3. Verify WAHA sequence order (without check-exists or sendSeen): session check -> startTyping -> stopTyping -> sendText
    expect(wahaCalls.map((c) => new URL(c.url).pathname)).toEqual([
      '/api/sessions/agencia-a',
      '/api/startTyping',
      '/api/stopTyping',
      '/api/sendText',
    ])
    const sendTextCall = wahaCalls.find((c) => c.url.endsWith('/api/sendText'))!
    expect(sendTextCall.body).toEqual({
      session: 'agencia-a',
      chatId: '5491155551234@c.us',
      text: 'Hola Juan Pérez, tu cuota (patente AB123CD) vence el 20/11/2026 por $45.000,00.',
    })

    // 4. Simulate WAHA message.ack -> Meta signed webhook to whatsapp-service
    const ackPayload = JSON.stringify({
      event: 'message.ack',
      session: 'agencia-a',
      payload: {
        id: 'true_5491155551234@c.us_WAHA999',
        ack: 3,
        ackName: 'READ',
      },
    })
    const ackSig = createHmac('sha512', config.wahaWebhookHmacKey)
      .update(ackPayload)
      .digest('hex')

    const ackRes = await app.request('/internal/waha-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Hmac': ackSig,
      },
      body: ackPayload,
    })
    expect(ackRes.status).toBe(200)
    expect(await ackRes.json()).toEqual({ ok: true, forwarded: true })

    expect(webhookCalls).toHaveLength(1)
    const forwardedAck = JSON.parse(webhookCalls[0].rawBody)
    expect(
      await verifyMetaSignatureLikeWorker(
        webhookCalls[0].rawBody,
        webhookCalls[0].headers['x-hub-signature-256'],
        config.metaAppSecret,
      ),
    ).toBe(true)
    expect(forwardedAck.entry[0].changes[0].value.metadata.phone_number_id).toBe(
      'agency-a-phone-id',
    )
    expect(forwardedAck.entry[0].changes[0].value.statuses[0]).toMatchObject({
      id: wamid,
      status: 'read',
      recipient_id: '5491155551234',
    })

    // 5. Simulate WAHA inbound customer message (ignoring group chats / fromMe)
    const inboundPayload = JSON.stringify({
      event: 'message',
      session: 'agencia-a',
      payload: {
        id: 'false_5491155551234@c.us_INBOUND1',
        from: '5491155551234@c.us',
        fromMe: false,
        timestamp: 1731700000,
        body: 'Gracias, ya pagué',
        hasMedia: false,
        _data: { notifyName: 'Juan Pérez' },
      },
    })
    const inboundSig = createHmac('sha512', config.wahaWebhookHmacKey)
      .update(inboundPayload)
      .digest('hex')

    const inboundRes = await app.request('/internal/waha-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Hmac': inboundSig,
      },
      body: inboundPayload,
    })
    expect(inboundRes.status).toBe(200)
    expect(webhookCalls).toHaveLength(2)
    const forwardedInbound = JSON.parse(webhookCalls[1].rawBody)
    expect(forwardedInbound.entry[0].changes[0].value.contacts[0]).toEqual({
      profile: { name: 'Juan Pérez' },
      wa_id: '5491155551234',
    })
    expect(forwardedInbound.entry[0].changes[0].value.messages[0]).toEqual({
      id: 'false_5491155551234@c.us_INBOUND1',
      from: '5491155551234',
      timestamp: '1731700000',
      type: 'text',
      text: { body: 'Gracias, ya pagué' },
    })

    // 6. Observability endpoints reflect complete timeline
    const eventsRes = await app.request(`/observability/events?wamid=${encodeURIComponent(wamid)}`, {
      headers: { Authorization: 'Bearer global-bearer-token' },
    })
    expect(eventsRes.status).toBe(200)
    const eventsJson = (await eventsRes.json()) as any
    const eventTypes = eventsJson.items.map((e: any) => e.eventType)
    expect(eventTypes).toContain('job_enqueued')
    expect(eventTypes).toContain('job_claimed')
    expect(eventTypes).toContain('typing_simulation')
    expect(eventTypes).toContain('waha_dispatched')
    expect(eventTypes).toContain('waha_ack_received')
    expect(eventTypes).toContain('copas_webhook_sent')
  })

  it('returns 503 when WAHA session is not WORKING and emits failed webhook on permanent dispatch error', async () => {
    const webhookCalls: Array<{ rawBody: string }> = []
    let sessionState = 'SCAN_QR_CODE'

    fetchMock.mockImplementation(async (input: string | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.startsWith('https://whatsapp-service.test/')) {
        webhookCalls.push({ rawBody: String(init?.body || '') })
        return new Response('{}', { status: 200 })
      }
      if (url.endsWith('/api/sessions/default')) {
        return new Response(JSON.stringify({ name: 'default', status: sessionState }), {
          status: 200,
        })
      }
      if (url.endsWith('/api/sendText')) {
        return new Response(JSON.stringify({ error: 'Invalid recipient JID' }), { status: 400 })
      }
      return new Response('{}', { status: 200 })
    })

    const waha = new WahaClient(config.wahaBaseUrl, config.wahaApiKey)
    const webhooks = new WebhookEmulator(config, store)
    const dispatcher = new HumanDispatcher(config, store, waha, webhooks)
    const app = createProxyApp({ config, store, waha, dispatcher, webhooks })

    const notReady = await app.request('/v20.0/default/messages', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer global-bearer-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: '5491112345678', type: 'text', text: { body: 'hola' } }),
    })
    expect(notReady.status).toBe(503)

    // Now session is WORKING, but number is not registered on WhatsApp
    sessionState = 'WORKING'
    const accepted = await app.request('/v20.0/default/messages', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer global-bearer-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: '5491112345678', type: 'text', text: { body: 'hola' } }),
    })
    expect(accepted.status).toBe(200)
    const { messages } = (await accepted.json()) as any
    const wamid = messages[0].id

    await dispatcher.waitIdle()

    const jobs = store.listJobs({ status: 'failed' })
    expect(jobs).toHaveLength(1)
    expect(jobs[0].wamid).toBe(wamid)

    expect(webhookCalls).toHaveLength(1)
    const failedWebhook = JSON.parse(webhookCalls[0].rawBody)
    expect(failedWebhook.entry[0].changes[0].value.statuses[0]).toMatchObject({
      id: wamid,
      status: 'failed',
      errors: [{ code: 131026, title: 'WahaDispatchFailed' }],
    })
  })

  it('retries transient WAHA 503 errors and resolves Argentine 54/549 numbers via check-exists', async () => {
    let sendTextAttempts = 0
    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = String(input)
      if (url.endsWith('/api/sessions/default')) {
        return new Response(JSON.stringify({ name: 'default', status: 'WORKING' }), {
          status: 200,
        })
      }
      if (url.includes('/api/contacts/check-exists')) {
        const phone = new URL(url).searchParams.get('phone')
        if (phone === '541155551234') {
          return new Response(JSON.stringify({ numberExists: false }), { status: 200 })
        }
        if (phone === '5491155551234') {
          return new Response(
            JSON.stringify({ numberExists: true, chatId: '5491155551234@c.us' }),
            { status: 200 },
          )
        }
      }
      if (url.endsWith('/api/sendText')) {
        sendTextAttempts++
        if (sendTextAttempts === 1) {
          return new Response(JSON.stringify({ error: 'Temporary WAHA glitch' }), { status: 503 })
        }
        return new Response(JSON.stringify({ id: 'true_5491155551234@c.us_RETRY_OK' }), {
          status: 200,
        })
      }
      return new Response('{}', { status: 200 })
    })

    const checkConfig = { ...config, wahaCheckNumberExists: true }
    const waha = new WahaClient(checkConfig.wahaBaseUrl, checkConfig.wahaApiKey)
    const webhooks = new WebhookEmulator(checkConfig, store)
    const dispatcher = new HumanDispatcher(checkConfig, store, waha, webhooks)
    const app = createProxyApp({ config: checkConfig, store, waha, dispatcher, webhooks })

    const res = await app.request('/v20.0/default/messages', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer global-bearer-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: '541155551234', type: 'text', text: { body: 'Reintento ok' } }),
    })
    expect(res.status).toBe(200)
    const { messages } = (await res.json()) as any
    const wamid = messages[0].id

    await dispatcher.waitIdle()

    expect(sendTextAttempts).toBe(2)
    const mapping = store.findMappingByWamid(wamid)
    expect(mapping?.waha_message_id).toBe('true_5491155551234@c.us_RETRY_OK')
    const events = store.listEvents({ wamid }).map((e) => e.eventType)
    expect(events).toContain('job_retry')
    expect(events).toContain('waha_dispatched')
  })

  it('correlates WAHA NOWEB serialized message.ack IDs with short sendText stanza IDs', async () => {
    const webhookCalls: Array<{ rawBody: string; signature: string | null }> = []
    fetchMock.mockImplementation(async (input: string | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/sessions/default')) {
        return new Response(JSON.stringify({ name: 'default', status: 'WORKING' }), {
          status: 200,
        })
      }
      if (url.endsWith('/api/sendText')) {
        return new Response(JSON.stringify({ id: '3EB0A7BF2C2162EA1DA41A' }), {
          status: 200,
        })
      }
      if (url === config.copasWebhookUrl) {
        const headers = new Headers(init?.headers)
        webhookCalls.push({
          rawBody: String(init?.body ?? ''),
          signature: headers.get('X-Hub-Signature-256'),
        })
        return new Response('ok', { status: 200 })
      }
      return new Response('{}', { status: 200 })
    })

    const waha = new WahaClient(config.wahaBaseUrl, config.wahaApiKey)
    const webhooks = new WebhookEmulator(config, store)
    const dispatcher = new HumanDispatcher(config, store, waha, webhooks)
    const app = createProxyApp({ config, store, waha, dispatcher, webhooks })

    const sendRes = await app.request('/v20.0/default/messages', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer global-bearer-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: '5491155551234', type: 'text', text: { body: 'NOWEB ack test' } }),
    })
    expect(sendRes.status).toBe(200)
    const { messages } = (await sendRes.json()) as any
    const wamid = messages[0].id

    await dispatcher.waitIdle()
    expect(store.findMappingByWamid(wamid)?.waha_message_id).toBe('3EB0A7BF2C2162EA1DA41A')

    const sendAck = async (payloadBody: Record<string, unknown>) => {
      const raw = JSON.stringify({
        event: 'message.ack',
        session: 'default',
        payload: payloadBody,
      })
      const sig = createHmac('sha512', config.wahaWebhookHmacKey).update(raw).digest('hex')
      return app.request('/internal/waha-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Hmac': sig,
        },
        body: raw,
      })
    }

    const deliveredRes = await sendAck({
      id: 'true_5491155551234@c.us_3EB0A7BF2C2162EA1DA41A',
      ack: 2,
      ackName: 'DEVICE',
      _data: { key: { id: '3EB0A7BF2C2162EA1DA41A' } },
    })
    expect(deliveredRes.status).toBe(200)
    expect(await deliveredRes.json()).toEqual({ ok: true, forwarded: true })

    const readRes = await sendAck({
      id: 'true_5491155551234@c.us_3EB0A7BF2C2162EA1DA41A',
      ack: 3,
      ackName: 'READ',
    })
    expect(readRes.status).toBe(200)
    expect(await readRes.json()).toEqual({ ok: true, forwarded: true })

    expect(webhookCalls).toHaveLength(2)
    expect(
      await verifyMetaSignatureLikeWorker(
        webhookCalls[0].rawBody,
        webhookCalls[0].signature ?? undefined,
        config.metaAppSecret,
      ),
    ).toBe(true)

    const deliveredMeta = JSON.parse(webhookCalls[0].rawBody)
    expect(deliveredMeta.entry[0].changes[0].value.statuses[0]).toMatchObject({
      id: wamid,
      status: 'delivered',
      recipient_id: '5491155551234',
    })

    const readMeta = JSON.parse(webhookCalls[1].rawBody)
    expect(readMeta.entry[0].changes[0].value.statuses[0]).toMatchObject({
      id: wamid,
      status: 'read',
      recipient_id: '5491155551234',
    })

    const events = store.listEvents({ wamid }).map((e) => e.eventType)
    expect(events).toContain('waha_ack_received')
  })

  it('resolves NOWEB @lid inbound sender via remoteJidAlt and pushName', async () => {
    const webhookCalls: Array<{ rawBody: string }> = []
    fetchMock.mockImplementation(async (input: string | URL, init?: RequestInit) => {
      if (String(input) === config.copasWebhookUrl) {
        webhookCalls.push({ rawBody: String(init?.body ?? '') })
        return new Response('ok', { status: 200 })
      }
      return new Response('{}', { status: 200 })
    })

    const waha = new WahaClient(config.wahaBaseUrl, config.wahaApiKey)
    const webhooks = new WebhookEmulator(config, store)
    const dispatcher = new HumanDispatcher(config, store, waha, webhooks)
    const app = createProxyApp({ config, store, waha, dispatcher, webhooks })

    const raw = JSON.stringify({
      event: 'message',
      session: 'default',
      payload: {
        id: 'false_265862921642168@lid_AC5D386F80C86D87A3822B10534859E0',
        from: '265862921642168@lid',
        fromMe: false,
        timestamp: 1794885805,
        body: 'Njimm',
        hasMedia: false,
        _data: {
          key: {
            remoteJid: '265862921642168@lid',
            remoteJidAlt: '5493704609703@s.whatsapp.net',
            addressingMode: 'lid',
          },
          pushName: 'Lu',
        },
      },
    })
    const sig = createHmac('sha512', config.wahaWebhookHmacKey).update(raw).digest('hex')
    const res = await app.request('/internal/waha-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Hmac': sig,
      },
      body: raw,
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, forwarded: true })
    expect(webhookCalls).toHaveLength(1)

    const forwarded = JSON.parse(webhookCalls[0].rawBody)
    expect(forwarded.entry[0].changes[0].value.contacts[0]).toEqual({
      wa_id: '5493704609703',
      profile: { name: 'Lu' },
    })
    expect(forwarded.entry[0].changes[0].value.messages[0]).toMatchObject({
      id: 'false_265862921642168@lid_AC5D386F80C86D87A3822B10534859E0',
      from: '5493704609703',
      type: 'text',
      text: { body: 'Njimm' },
    })
  })

  it('renders the shipped config/templates.json recordatorio_vencimiento template with agency_name and fallback', () => {
    const shippedTemplates = loadTemplatesConfig(
      join(process.cwd(), 'config/templates.json'),
    )
    const withAgency = buildOutboundAction(
      {
        to: '5491155551234',
        type: 'template',
        template: {
          name: 'recordatorio_vencimiento',
          language: { code: 'es_AR' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', parameter_name: 'customer_name', text: 'Prueba' },
                { type: 'text', parameter_name: 'agency_name', text: 'Seguros Norte' },
                { type: 'text', parameter_name: 'plate_number', text: 'AA111BB' },
                { type: 'text', parameter_name: 'expiration_date', text: '22/11/2026' },
                { type: 'text', parameter_name: 'amount', text: '15.000,00' },
              ],
            },
          ],
        },
      },
      shippedTemplates,
    )
    expect(withAgency).toEqual({
      kind: 'text',
      text: 'Hola Prueba, te escribimos de parte de Seguros Norte. Te recordamos que la cuota de tu póliza (patente AA111BB) vence el 22/11/2026 por un monto de $15.000,00.\n\nPara mantener la vigencia de tu cobertura, podés realizar el pago por los canales habituales. Si ya lo abonaste, por favor desestimá este mensaje.',
    })

    const withFallback = buildOutboundAction(
      {
        to: '5491155551234',
        type: 'template',
        template: {
          name: 'recordatorio_vencimiento',
          language: { code: 'es_AR' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', parameter_name: 'customer_name', text: 'Prueba' },
                { type: 'text', parameter_name: 'plate_number', text: 'AA111BB' },
                { type: 'text', parameter_name: 'expiration_date', text: '22/11/2026' },
                { type: 'text', parameter_name: 'amount', text: '15.000,00' },
              ],
            },
          ],
        },
      },
      shippedTemplates,
    )
    expect(withFallback).toEqual({
      kind: 'text',
      text: 'Hola Prueba, te escribimos de parte de tu productor asesor de seguros. Te recordamos que la cuota de tu póliza (patente AA111BB) vence el 22/11/2026 por un monto de $15.000,00.\n\nPara mantener la vigencia de tu cobertura, podés realizar el pago por los canales habituales. Si ya lo abonaste, por favor desestimá este mensaje.',
    })
  })

  it('serves remote QR pairing portal, QR image/status/start routes, and per-session agencyName template fallback', async () => {
    const startCalls: Array<{ url: string; body: any }> = []
    let sessionCreated = false
    let sendSeq = 0
    fetchMock.mockImplementation(async (input: string | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/sessions?all=true')) {
        return new Response(
          JSON.stringify([{ name: 'agencia-remota', status: 'SCAN_QR_CODE' }]),
          { status: 200 },
        )
      }
      if (url.endsWith('/api/sessions/agencia-remota') && (!init?.method || init.method === 'GET')) {
        if (!sessionCreated) {
          return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 })
        }
        return new Response(
          JSON.stringify({ name: 'agencia-remota', status: 'SCAN_QR_CODE' }),
          { status: 200 },
        )
      }
      if (url.endsWith('/api/sessions') && init?.method === 'POST') {
        sessionCreated = true
        startCalls.push({ url, body: JSON.parse(String(init.body || '{}')) })
        return new Response(JSON.stringify({ name: 'agencia-remota', status: 'STARTING' }), {
          status: 201,
        })
      }
      if (url.endsWith('/api/agencia-remota/auth/qr?format=image')) {
        return new Response(new Uint8Array([137, 80, 78, 71]), {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        })
      }
      if (url.endsWith('/api/sendText')) {
        sendSeq++
        startCalls.push({ url, body: JSON.parse(String(init?.body || '{}')) })
        return new Response(JSON.stringify({ id: `WAHA_AGENCY_${sendSeq}` }), { status: 200 })
      }
      if (url.endsWith('/api/sessions/agencia-a')) {
        return new Response(JSON.stringify({ name: 'agencia-a', status: 'WORKING' }), {
          status: 200,
        })
      }
      return new Response('{}', { status: 200 })
    })

    writeFileSync(
      config.sessionsConfigPath,
      JSON.stringify(
        {
          allowDefaultSessionFallback: false,
          sessions: {
            'agency-a-phone-id': {
              wahaSession: 'agencia-a',
              displayPhone: '5491140001111',
              agencyName: 'LucianaPAS Seguros',
            },
          },
        },
        null,
        2,
      ),
    )

    const waha = new WahaClient(config.wahaBaseUrl, config.wahaApiKey)
    const webhooks = new WebhookEmulator(config, store)
    const dispatcher = new HumanDispatcher(config, store, waha, webhooks)
    const app = createProxyApp({ config, store, waha, dispatcher, webhooks })

    const loginRes = await app.request('/qr/agencia-remota')
    expect(loginRes.status).toBe(200)
    expect(await loginRes.text()).toContain('Token de administrador')

    const badLoginRes = await app.request('/qr/agencia-remota?token=wrong')
    expect(badLoginRes.status).toBe(401)

    // Privilege separation: PROXY_BEARER_TOKEN must NOT grant access to QR portal
    const bearerOnQrPage = await app.request('/qr/agencia-remota?token=global-bearer-token')
    expect(bearerOnQrPage.status).toBe(401)
    const bearerOnQrStatus = await app.request('/qr/agencia-remota/status', {
      headers: { Authorization: 'Bearer global-bearer-token' },
    })
    expect(bearerOnQrStatus.status).toBe(401)

    // Privilege separation: QR_PORTAL_TOKEN must NOT grant access to Meta API or Observability
    const qrTokenOnMeta = await app.request('/v20.0/default/messages', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer qr-admin-token-test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: '5491155551234', type: 'text', text: { body: 'x' } }),
    })
    expect(qrTokenOnMeta.status).toBe(401)
    const qrTokenOnObs = await app.request('/observability/status', {
      headers: { Authorization: 'Bearer qr-admin-token-test' },
    })
    expect(qrTokenOnObs.status).toBe(401)

    const unauthStatus = await app.request('/qr/agencia-remota/status')
    expect(unauthStatus.status).toBe(401)

    // Admin login via POST /qr/login sets HttpOnly cookie, redirects to control panel, and strips secrets from URL
    const postLogin = await app.request('/qr/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'token=qr-admin-token-test&session=agencia-remota',
    })
    expect(postLogin.status).toBe(303)
    expect(postLogin.headers.get('location')).toBe('/qr?session=agencia-remota')
    const setCookie = postLogin.headers.get('set-cookie') || ''
    expect(setCookie).toContain('waha_qr_admin=')
    expect(setCookie).toContain('HttpOnly')
    const cookiePair = setCookie.split(';')[0]

    const panelRes = await app.request('/qr?session=agencia-remota', {
      headers: { Cookie: cookiePair },
    })
    expect(panelRes.status).toBe(200)
    const panelHtml = await panelRes.text()
    expect(panelHtml).toContain('Panel de Control WhatsApp')
    expect(panelHtml).toContain('Disparo Manual de Mensaje')
    expect(panelHtml).toContain('Generar y copiar link')
    expect(panelHtml).not.toContain('qr-admin-token-test')
    expect(panelHtml).not.toContain('global-bearer-token')

    const adminQrRes = await app.request('/qr/agencia-remota', {
      headers: { Cookie: cookiePair },
    })
    expect(adminQrRes.status).toBe(200)
    const adminQrHtml = await adminQrRes.text()
    expect(adminQrHtml).toContain('Vinculá tu WhatsApp con CoPAS')
    expect(adminQrHtml).not.toContain('Panel de control')
    expect(adminQrHtml).not.toContain('Disparo Manual de Mensaje')

    const startRes = await app.request('/qr/agencia-remota/start', {
      method: 'POST',
      headers: { Cookie: cookiePair },
    })
    expect(startRes.status).toBe(200)
    expect(await startRes.json()).toEqual({
      ok: true,
      session: { name: 'agencia-remota', status: 'STARTING' },
    })
    expect(startCalls[0].body.name).toBe('agencia-remota')
    expect(startCalls[0].body.config.webhooks[0].url).toBe('http://waha-proxy:8080/internal/waha-webhook')

    const statusRes = await app.request('/qr/agencia-remota/status?token=qr-admin-token-test')
    expect(statusRes.status).toBe(200)
    const statusJson = (await statusRes.json()) as any
    expect(statusJson.role).toBe('admin')
    expect(statusJson.detail).toEqual({ name: 'agencia-remota', status: 'SCAN_QR_CODE' })

    const imgRes = await app.request('/qr/agencia-remota/image?token=qr-admin-token-test')
    expect(imgRes.status).toBe(200)
    expect(imgRes.headers.get('content-type')).toBe('image/png')
    expect(new Uint8Array(await imgRes.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]))

    // Scoped invite minting & strict single-session enforcement
    const inviteMintRes = await app.request('/qr/agencia-remota/invite', {
      method: 'POST',
      headers: {
        Cookie: cookiePair,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttlMinutes: 15 }),
    })
    expect(inviteMintRes.status).toBe(200)
    const inviteMintJson = (await inviteMintRes.json()) as any
    const inviteToken: string = inviteMintJson.inviteToken
    expect(inviteMintJson.invitePath).toBe(`/qr/agencia-remota?invite=${encodeURIComponent(inviteToken)}`)

    const guestHtmlRes = await app.request(`/qr/agencia-remota?invite=${encodeURIComponent(inviteToken)}`, {
      headers: {
        Host: 'wa.copas.com.ar',
        'CF-Connecting-IP': '190.10.20.30',
        'CF-Ray': 'abc123',
      },
    })
    expect(guestHtmlRes.status).toBe(200)
    const guestHtml = await guestHtmlRes.text()
    expect(guestHtml).toContain('CoPAS')
    expect(guestHtml).toContain('Vinculá tu WhatsApp con CoPAS')
    expect(guestHtml).toContain('Generar código QR')
    expect(guestHtml).toContain('Escaneá este código QR')
    expect(guestHtml).toContain('Actualizar QR')
    expect(guestHtml).toContain('¡Conexión exitosa!')
    expect(guestHtml).toContain('Ya podés cerrar esta pestaña')
    expect(guestHtml).toContain('launchConfetti')
    expect(guestHtml).not.toContain('Ya lo escaneé')
    expect(guestHtml).not.toContain('Panel de control')
    expect(guestHtml).not.toContain('Disparo Manual de Mensaje')
    expect(guestHtml).not.toContain('Sesiones registradas')
    expect(guestHtml).not.toContain('Cerrar sesión / Cambiar número')
    expect(guestHtml).not.toContain('pairPhone')
    expect(guestHtml).not.toContain('WAHA')

    // Local-only protection: external tunnel requests MUST NOT reach control panel or admin routes, even with admin token/cookie
    const tunneledHeaders = {
      Host: 'wa.copas.com.ar',
      'CF-Connecting-IP': '190.10.20.30',
      'CF-Ray': 'abc123',
      Cookie: cookiePair,
    }
    expect((await app.request('/qr', { headers: tunneledHeaders })).status).toBe(403)
    expect((await app.request('/qr/login', { method: 'POST', headers: tunneledHeaders, body: 'token=qr-admin-token-test' })).status).toBe(403)
    expect((await app.request('/qr/agencia-remota', { headers: tunneledHeaders })).status).toBe(403)
    expect((await app.request('/qr/agencia-remota/invite', { method: 'POST', headers: tunneledHeaders })).status).toBe(403)
    expect((await app.request('/qr/agencia-remota/test-send?token=qr-admin-token-test', { method: 'POST', headers: tunneledHeaders })).status).toBe(403)
    expect((await app.request('/qr', { headers: { Host: 'node.tail.ts.net', 'X-Forwarded-For': '190.10.20.30', Cookie: cookiePair } })).status).toBe(403)

    const guestStatus = await app.request(`/qr/agencia-remota/status?invite=${encodeURIComponent(inviteToken)}`, {
      headers: tunneledHeaders,
    })
    expect(guestStatus.status).toBe(200)
    const guestStatusJson = (await guestStatus.json()) as any
    expect(guestStatusJson.role).toBe('invite')
    expect(guestStatusJson.sessionsConfig).toBeUndefined()

    const guestImg = await app.request(`/qr/agencia-remota/image?invite=${encodeURIComponent(inviteToken)}`, {
      headers: tunneledHeaders,
    })
    expect(guestImg.status).toBe(200)

    // Guest invite cannot access other sessions, admin root, destructive actions, pairing-code, or test-send
    expect((await app.request(`/qr?invite=${encodeURIComponent(inviteToken)}`)).status).toBe(401)
    expect((await app.request(`/qr/otra-sesion/status?invite=${encodeURIComponent(inviteToken)}`)).status).toBe(403)
    expect((await app.request(`/qr/agencia-remota/restart?invite=${encodeURIComponent(inviteToken)}`, { method: 'POST' })).status).toBe(403)
    expect((await app.request(`/qr/agencia-remota/logout?invite=${encodeURIComponent(inviteToken)}`, { method: 'POST' })).status).toBe(403)
    expect((await app.request(`/qr/agencia-remota/pairing-code?invite=${encodeURIComponent(inviteToken)}`, { method: 'POST' })).status).toBe(403)
    expect((await app.request(`/qr/agencia-remota/invite?invite=${encodeURIComponent(inviteToken)}`, { method: 'POST' })).status).toBe(403)
    expect((await app.request(`/qr/agencia-remota/test-send?invite=${encodeURIComponent(inviteToken)}`, { method: 'POST' })).status).toBe(403)
    expect((await app.request(`/qr/agencia-remota?invite=tampered.sig`)).status).toBe(403)

    // Expired invite fails verification
    const expiredInvite = signQrInviteToken({
      session: 'agencia-remota',
      ttlSeconds: 60,
      secret: config.qrInviteSecret,
      nowSec: 1000,
    })
    expect(verifyQrInviteToken(expiredInvite, 'agencia-remota', config.qrInviteSecret, 2000)).toEqual({ valid: false })

    // Verify per-session agencyName fills {{agency_name}} when CoPAS omits it
    writeFileSync(
      config.templatesConfigPath,
      JSON.stringify({
        templates: {
          recordatorio_vencimiento: {
            es_AR: 'Hola {{customer_name}}, de parte de {{agency_name}} ({{plate_number}}).',
          },
        },
      }),
    )
    const sendRes = await app.request('/v20.0/agency-a-phone-id/messages', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer global-bearer-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: '543704609703',
        type: 'template',
        template: {
          name: 'recordatorio_vencimiento',
          language: { code: 'es_AR' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', parameter_name: 'customer_name', text: 'Carlos' },
                { type: 'text', parameter_name: 'plate_number', text: 'AF123CD' },
              ],
            },
          ],
        },
      }),
    })
    expect(sendRes.status).toBe(200)
    await dispatcher.waitIdle()
    const sendTextCall = startCalls.find((c) => c.url.endsWith('/api/sendText'))
    expect(sendTextCall?.body.text).toBe('Hola Carlos, de parte de LucianaPAS Seguros (AF123CD).')

    // Admin portal test-send endpoint dispatches without exposing PROXY_BEARER_TOKEN
    const adminTestSendRes = await app.request('/qr/agencia-a/test-send', {
      method: 'POST',
      headers: {
        Cookie: cookiePair,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumberId: 'agency-a-phone-id',
        to: '543704609703',
        type: 'text',
        text: { body: 'Prueba admin portal' },
      }),
    })
    expect(adminTestSendRes.status).toBe(200)
    const adminTestJson = (await adminTestSendRes.json()) as any
    await dispatcher.waitIdle()
    const adminEventsRes = await app.request(
      `/qr/agencia-a/events?wamid=${encodeURIComponent(adminTestJson.messages[0].id)}`,
      { headers: { Cookie: cookiePair } },
    )
    expect(adminEventsRes.status).toBe(200)
    const adminEventsJson = (await adminEventsRes.json()) as any
    expect(adminEventsJson.items.map((e: any) => e.eventType)).toContain('waha_dispatched')

    // Kill-switch disables all /qr routes when ENABLE_QR_PORTAL=false
    const disabledApp = createProxyApp({
      config: { ...config, enableQrPortal: false },
      store,
      waha,
      dispatcher,
      webhooks,
    })
    expect((await disabledApp.request('/qr')).status).toBe(404)
    expect((await disabledApp.request('/qr/agencia-remota/status?token=qr-admin-token-test')).status).toBe(404)
  })

  it.each([
    ['WORKING', 'connected'],
    ['SCAN_QR_CODE', 'waiting_qr'],
    ['STOPPED', 'disconnected'],
    ['FAILED', 'error'],
  ] as const)(
    'forwards WAHA session.status "%s" as "%s" to COPAS_API_STATUS_WEBHOOK_URL signed with COPAS_STATUS_WEBHOOK_SECRET',
    async (wahaStatus, expectedCopasStatus) => {
      const fx = makeTempFixtures()
      try {
        const statusWebhookUrl = 'https://api.copas.test/webhooks/whatsapp-channel-status'
        const statusSecret = 'copas-status-secret-test'
        const statusConfig = makeTestConfig(
          { sessionsPath: fx.sessionsPath, templatesPath: fx.templatesPath },
          {
            COPAS_API_STATUS_WEBHOOK_URL: statusWebhookUrl,
            COPAS_STATUS_WEBHOOK_SECRET: statusSecret,
          },
        )

        const statusCalls: Array<{ rawBody: string; signature: string | null }> = []
        fetchMock.mockImplementation(async (input: string | URL, init?: RequestInit) => {
          if (String(input) === statusWebhookUrl) {
            const headers = new Headers(init?.headers)
            statusCalls.push({
              rawBody: String(init?.body ?? ''),
              signature: headers.get('X-Hub-Signature-256'),
            })
            return new Response(JSON.stringify({ ok: true }), { status: 200 })
          }
          return new Response('{}', { status: 200 })
        })

        const waha = new WahaClient(statusConfig.wahaBaseUrl, statusConfig.wahaApiKey)
        const webhooks = new WebhookEmulator(statusConfig, store)
        const dispatcher = new HumanDispatcher(statusConfig, store, waha, webhooks)
        const app = createProxyApp({ config: statusConfig, store, waha, dispatcher, webhooks })

        const raw = JSON.stringify({
          event: 'session.status',
          session: 'agencia-a',
          payload: {
            name: 'agencia-a',
            status: wahaStatus,
          },
        })
        const wahaSig = createHmac('sha512', statusConfig.wahaWebhookHmacKey)
          .update(raw)
          .digest('hex')

        const res = await app.request('/internal/waha-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Hmac': wahaSig,
          },
          body: raw,
        })

        expect(res.status).toBe(200)
        expect(await res.json()).toMatchObject({
          ok: true,
          forwarded: true,
          reason: 'session_status_forwarded',
        })
        expect(statusCalls).toHaveLength(1)
        expect(
          await verifyMetaSignatureLikeWorker(
            statusCalls[0].rawBody,
            statusCalls[0].signature,
            statusSecret,
          ),
        ).toBe(true)

        expect(JSON.parse(statusCalls[0].rawBody)).toMatchObject({
          phoneNumber: '5491122223333',
          phoneNumberId: 'agency-a-phone-id',
          status: expectedCopasStatus,
        })
      } finally {
        rmSync(fx.dir, { recursive: true, force: true })
      }
    },
  )

  it('falls back to META_APP_SECRET when COPAS_STATUS_WEBHOOK_SECRET is unset for session.status webhooks', async () => {
    const fx = makeTempFixtures()
    try {
      const statusWebhookUrl = 'https://api.copas.test/webhooks/whatsapp-channel-status'
      const statusConfig = makeTestConfig(
        { sessionsPath: fx.sessionsPath, templatesPath: fx.templatesPath },
        {
          COPAS_API_STATUS_WEBHOOK_URL: statusWebhookUrl,
        },
      )

      const statusCalls: Array<{ rawBody: string; signature: string | null }> = []
      fetchMock.mockImplementation(async (input: string | URL, init?: RequestInit) => {
        if (String(input) === statusWebhookUrl) {
          const headers = new Headers(init?.headers)
          statusCalls.push({
            rawBody: String(init?.body ?? ''),
            signature: headers.get('X-Hub-Signature-256'),
          })
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }
        return new Response('{}', { status: 200 })
      })

      const waha = new WahaClient(statusConfig.wahaBaseUrl, statusConfig.wahaApiKey)
      const webhooks = new WebhookEmulator(statusConfig, store)
      const dispatcher = new HumanDispatcher(statusConfig, store, waha, webhooks)
      const app = createProxyApp({ config: statusConfig, store, waha, dispatcher, webhooks })

      const raw = JSON.stringify({
        event: 'session.status',
        session: 'agencia-a',
        payload: { name: 'agencia-a', status: 'WORKING' },
      })
      const wahaSig = createHmac('sha512', statusConfig.wahaWebhookHmacKey)
        .update(raw)
        .digest('hex')

      const res = await app.request('/internal/waha-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Hmac': wahaSig,
        },
        body: raw,
      })

      expect(res.status).toBe(200)
      expect(statusCalls).toHaveLength(1)
      expect(
        await verifyMetaSignatureLikeWorker(
          statusCalls[0].rawBody,
          statusCalls[0].signature,
          statusConfig.metaAppSecret,
        ),
      ).toBe(true)
    } finally {
      rmSync(fx.dir, { recursive: true, force: true })
    }
  })

  it('POST /qr/sync-status admin endpoint syncs live WAHA sessions to CoPAS API and rejects unauthorized/tunneled callers', async () => {
    const fx = makeTempFixtures()
    try {
      const statusWebhookUrl = 'https://api.copas.test/webhooks/whatsapp-channel-status'
      const statusSecret = 'copas-status-secret-sync'
      const statusConfig = makeTestConfig(
        { sessionsPath: fx.sessionsPath, templatesPath: fx.templatesPath },
        {
          COPAS_API_STATUS_WEBHOOK_URL: statusWebhookUrl,
          COPAS_STATUS_WEBHOOK_SECRET: statusSecret,
        },
      )

      const statusCalls: Array<{ rawBody: string; signature: string | null }> = []
      fetchMock.mockImplementation(async (input: string | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/api/sessions?all=true')) {
          return new Response(
            JSON.stringify([
              { name: 'default', status: 'WORKING' },
              { name: 'agencia-a', status: 'SCAN_QR_CODE' },
              { name: 'unmapped-session', status: 'STOPPED' },
            ]),
            { status: 200 },
          )
        }
        if (url === statusWebhookUrl) {
          const headers = new Headers(init?.headers)
          statusCalls.push({
            rawBody: String(init?.body ?? ''),
            signature: headers.get('X-Hub-Signature-256'),
          })
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }
        return new Response('{}', { status: 200 })
      })

      const waha = new WahaClient(statusConfig.wahaBaseUrl, statusConfig.wahaApiKey)
      const webhooks = new WebhookEmulator(statusConfig, store)
      const dispatcher = new HumanDispatcher(statusConfig, store, waha, webhooks)
      const app = createProxyApp({ config: statusConfig, store, waha, dispatcher, webhooks })

      // Unauthenticated -> 401
      const unauth = await app.request('/qr/sync-status', { method: 'POST' })
      expect(unauth.status).toBe(401)

      // External tunnel -> 403 even with admin token
      const tunneled = await app.request('/qr/sync-status?token=qr-admin-token-test', {
        method: 'POST',
        headers: {
          Host: 'wa.copas.com.ar',
          'CF-Connecting-IP': '190.10.20.30',
          'CF-Ray': 'abc123',
        },
      })
      expect(tunneled.status).toBe(403)

      // Authenticated local admin -> 200 and syncs live mapped sessions
      const syncRes = await app.request('/qr/sync-status?token=qr-admin-token-test', {
        method: 'POST',
      })
      expect(syncRes.status).toBe(200)
      const syncBody = (await syncRes.json()) as any
      expect(syncBody.ok).toBe(true)

      expect(statusCalls.length).toBeGreaterThanOrEqual(2)
      const payloads = statusCalls.map((c) => JSON.parse(c.rawBody))
      expect(payloads).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            phoneNumber: '5491100000000',
            status: 'connected',
            timestamp: expect.any(Number),
          }),
          expect.objectContaining({
            phoneNumber: '5491122223333',
            phoneNumberId: 'agency-a-phone-id',
            status: 'waiting_qr',
            timestamp: expect.any(Number),
          }),
        ]),
      )

      for (const call of statusCalls) {
        expect(
          await verifyMetaSignatureLikeWorker(call.rawBody, call.signature, statusSecret),
        ).toBe(true)
      }
    } finally {
      rmSync(fx.dir, { recursive: true, force: true })
    }
  })
})
