import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import {
  whatsappChannelStatusWebhookSchema,
  type OrganizationWhatsAppEndpoint,
} from '@copas/contracts'
import { createWhatsAppWebhooksRouter } from './whatsapp-webhooks.routes'

async function signWebhookPayload(rawBody: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody))
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `sha256=${hex}`
}

const makeEndpoint = (
  overrides: Partial<OrganizationWhatsAppEndpoint> = {},
): OrganizationWhatsAppEndpoint => ({
  endpointId: 'cep-org-1',
  organizationChannelEndpointId: 'oce-org-1',
  organizationId: 'org-123',
  number: '+54 9 11 1234-5678',
  provider: 'whatsapp_cloud',
  ownerKind: 'organization',
  status: 'active',
  linkingStatus: 'active',
  connectionStatus: 'connected',
  ...overrides,
})

describe('whatsapp-webhooks.routes', () => {
  const webhookSecret = 'test-whatsapp-status-webhook-secret-32chars'
  const metaSecret = 'test-meta-app-secret-fallback-32chars'

  let mockService: {
    syncWhatsAppConnectionStatus: ReturnType<typeof vi.fn>
  }

  const setupApp = () => {
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('channelEndpointsService' as any, mockService)
      c.set('services' as any, {
        channelEndpoints: mockService,
        channelEndpointsService: mockService,
        communications: {
          channelEndpoints: mockService,
          channelEndpointsService: mockService,
        },
      })
      await next()
    })

    const router = createWhatsAppWebhooksRouter({
      channelEndpointsService: mockService as any,
    })
    app.route('/webhooks', router)
    return app
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockService = {
      syncWhatsAppConnectionStatus: vi.fn(),
    }
  })

  describe('POST /whatsapp-channel-status', () => {
    const validPayload = {
      phoneNumber: '5491112345678',
      phoneNumberId: 'waha-phone-1',
      status: 'connected' as const,
      timestamp: 1794885805,
    }

    it('returns 401 when X-Hub-Signature-256 header is missing', async () => {
      const app = setupApp()
      const rawBody = JSON.stringify(validPayload)

      const res = await app.request(
        '/webhooks/whatsapp-channel-status',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: rawBody,
        },
        { WHATSAPP_STATUS_WEBHOOK_SECRET: webhookSecret } as any,
      )

      expect(res.status).toBe(401)
      expect(mockService.syncWhatsAppConnectionStatus).not.toHaveBeenCalled()
    })

    it.each([
      ['wrong secret', 'wrong-secret'],
      ['missing sha256= prefix', 'raw-invalid-signature'],
      ['malformed hex', 'sha256=zzzz'],
      ['wrong length hex', 'sha256=abcd'],
    ])('returns 401 when X-Hub-Signature-256 is invalid (%s)', async (_label, caseKind) => {
      const app = setupApp()
      const rawBody = JSON.stringify(validPayload)
      const signature =
        caseKind === 'wrong-secret'
          ? await signWebhookPayload(rawBody, 'different-secret')
          : caseKind

      const res = await app.request(
        '/webhooks/whatsapp-channel-status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': signature,
          },
          body: rawBody,
        },
        { WHATSAPP_STATUS_WEBHOOK_SECRET: webhookSecret } as any,
      )

      expect(res.status).toBe(401)
      expect(mockService.syncWhatsAppConnectionStatus).not.toHaveBeenCalled()
    })

    it('returns 401 when body was tampered after signing', async () => {
      const app = setupApp()
      const signedBody = JSON.stringify(validPayload)
      const signature = await signWebhookPayload(signedBody, webhookSecret)
      const tamperedBody = JSON.stringify({ ...validPayload, status: 'disconnected' })

      const res = await app.request(
        '/webhooks/whatsapp-channel-status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': signature,
          },
          body: tamperedBody,
        },
        { WHATSAPP_STATUS_WEBHOOK_SECRET: webhookSecret } as any,
      )

      expect(res.status).toBe(401)
      expect(mockService.syncWhatsAppConnectionStatus).not.toHaveBeenCalled()
    })

    it('returns 401 when neither WHATSAPP_STATUS_WEBHOOK_SECRET nor META_APP_SECRET is configured', async () => {
      const app = setupApp()
      const rawBody = JSON.stringify(validPayload)
      const signature = await signWebhookPayload(rawBody, webhookSecret)

      const res = await app.request(
        '/webhooks/whatsapp-channel-status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': signature,
          },
          body: rawBody,
        },
        {} as any,
      )

      expect(res.status).toBe(401)
      expect(mockService.syncWhatsAppConnectionStatus).not.toHaveBeenCalled()
    })

    it('returns 400 when signed request body is invalid JSON', async () => {
      const app = setupApp()
      const rawBody = '{invalid-json'
      const signature = await signWebhookPayload(rawBody, webhookSecret)

      const res = await app.request(
        '/webhooks/whatsapp-channel-status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': signature,
          },
          body: rawBody,
        },
        { WHATSAPP_STATUS_WEBHOOK_SECRET: webhookSecret } as any,
      )

      expect(res.status).toBe(400)
      expect(mockService.syncWhatsAppConnectionStatus).not.toHaveBeenCalled()
    })

    it.each([
      ['empty object', {}],
      ['phoneNumber too short', { phoneNumber: '12345', status: 'connected' }],
      ['unknown status value', { phoneNumber: '5491112345678', status: 'unknown' }],
      ['empty phoneNumberId', { phoneNumber: '5491112345678', phoneNumberId: '  ', status: 'connected' }],
      ['negative timestamp', { phoneNumber: '5491112345678', status: 'connected', timestamp: -1 }],
      ['non-integer timestamp', { phoneNumber: '5491112345678', status: 'connected', timestamp: 1.5 }],
    ])(
      'returns 400 when signed payload fails whatsappChannelStatusWebhookSchema (%s)',
      async (_label, invalidPayload) => {
        expect(whatsappChannelStatusWebhookSchema.safeParse(invalidPayload).success).toBe(false)
        const app = setupApp()
        const rawBody = JSON.stringify(invalidPayload)
        const signature = await signWebhookPayload(rawBody, webhookSecret)

        const res = await app.request(
          '/webhooks/whatsapp-channel-status',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': signature,
            },
            body: rawBody,
          },
          { WHATSAPP_STATUS_WEBHOOK_SECRET: webhookSecret } as any,
        )

        expect(res.status).toBe(400)
        expect(mockService.syncWhatsAppConnectionStatus).not.toHaveBeenCalled()
      },
    )

    it('returns 404 when syncWhatsAppConnectionStatus returns null', async () => {
      mockService.syncWhatsAppConnectionStatus.mockResolvedValueOnce(null)
      const app = setupApp()
      const rawBody = JSON.stringify(validPayload)
      const signature = await signWebhookPayload(rawBody, webhookSecret)

      const res = await app.request(
        '/webhooks/whatsapp-channel-status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': signature,
          },
          body: rawBody,
        },
        { WHATSAPP_STATUS_WEBHOOK_SECRET: webhookSecret } as any,
      )

      expect(res.status).toBe(404)
      expect(mockService.syncWhatsAppConnectionStatus).toHaveBeenCalledWith(validPayload)
    })

    it('returns 200 { ok: true, endpoint } on valid signed request with WHATSAPP_STATUS_WEBHOOK_SECRET', async () => {
      const endpoint = makeEndpoint()
      mockService.syncWhatsAppConnectionStatus.mockResolvedValueOnce(endpoint)
      const app = setupApp()
      const rawBody = JSON.stringify(validPayload)
      const signature = await signWebhookPayload(rawBody, webhookSecret)

      const res = await app.request(
        '/webhooks/whatsapp-channel-status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': signature,
          },
          body: rawBody,
        },
        { WHATSAPP_STATUS_WEBHOOK_SECRET: webhookSecret } as any,
      )

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true, endpoint })
      expect(mockService.syncWhatsAppConnectionStatus).toHaveBeenCalledOnce()
      expect(mockService.syncWhatsAppConnectionStatus).toHaveBeenCalledWith(validPayload)
    })

    it('falls back to META_APP_SECRET when WHATSAPP_STATUS_WEBHOOK_SECRET is not set', async () => {
      const endpoint = makeEndpoint({
        status: 'inactive',
        linkingStatus: 'suspended',
        connectionStatus: 'waiting_qr',
      })
      mockService.syncWhatsAppConnectionStatus.mockResolvedValueOnce(endpoint)
      const app = setupApp()
      const payload = {
        phoneNumber: '5491112345678',
        status: 'waiting_qr' as const,
      }
      const rawBody = JSON.stringify(payload)
      const signature = await signWebhookPayload(rawBody, metaSecret)

      const res = await app.request(
        '/webhooks/whatsapp-channel-status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': signature,
          },
          body: rawBody,
        },
        { META_APP_SECRET: metaSecret } as any,
      )

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true, endpoint })
      expect(mockService.syncWhatsAppConnectionStatus).toHaveBeenCalledWith(payload)
    })
  })
})
