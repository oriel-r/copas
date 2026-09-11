import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import crypto from 'node:crypto'
import type {
  WhatsAppInboundMessageQueueMessage,
  WhatsAppStatusUpdateQueueMessage,
  WhatsAppOutboundQueueMessage,
} from '@copas/contracts'
import * as workerModule from './index'

// --- Test Fixtures and Helper Utilities ---

const TEST_APP_SECRET = 'test_meta_app_secret_1234567890abcdef'
const TEST_VERIFY_TOKEN = 'copas_verify_token_secure_123'
const TEST_PHONE_NUMBER_ID = '109876543210123'
const TEST_ACCESS_TOKEN = 'EAAB_test_access_token_secret_meta_cloud'

const createMockEnv = (overrides?: Record<string, unknown>) => ({
  WHATSAPP_INBOUND_QUEUE: {
    send: vi.fn().mockResolvedValue(undefined),
    sendBatch: vi.fn().mockResolvedValue(undefined),
  },
  META_APP_SECRET: TEST_APP_SECRET,
  META_VERIFY_TOKEN: TEST_VERIFY_TOKEN,
  META_GRAPH_API_VERSION: 'v20.0',
  META_GRAPH_API_BASE_URL: 'https://graph.facebook.com',
  ...overrides,
})

const createMockCtx = () => ({
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
})

const generateHmacSignature = (body: string, secret: string = TEST_APP_SECRET): string => {
  const hash = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return `sha256=${hash}`
}

const dispatchHttp = async (
  path: string,
  init?: RequestInit,
  env?: ReturnType<typeof createMockEnv>,
  ctx?: ReturnType<typeof createMockCtx>,
): Promise<Response> => {
  const worker = (workerModule as any).default ?? workerModule
  if (typeof worker?.request === 'function') {
    return worker.request(path, init, env, ctx)
  }
  if (typeof worker?.fetch === 'function') {
    const url = path.startsWith('http') ? path : `http://localhost${path}`
    return worker.fetch(new Request(url, init), env, ctx)
  }
  throw new Error('Worker does not export a valid Hono app or fetch handler.')
}

const dispatchQueue = async (
  batch: any,
  env: ReturnType<typeof createMockEnv>,
  ctx: ReturnType<typeof createMockCtx>,
): Promise<void> => {
  const worker = (workerModule as any).default ?? workerModule
  const queueFn = (workerModule as any).queue ?? worker?.queue
  if (typeof queueFn !== 'function') {
    throw new Error('Worker does not export a queue() consumer handler.')
  }
  return queueFn(batch, env, ctx)
}

const extractEnqueuedInboundMessages = (queueMock: any): any[] => {
  const messages: any[] = []
  for (const call of queueMock.send.mock.calls) {
    messages.push(call[0]?.body ?? call[0])
  }
  for (const call of queueMock.sendBatch.mock.calls) {
    const batch = call[0]
    if (Array.isArray(batch)) {
      for (const item of batch) {
        messages.push(item?.body ?? item)
      }
    }
  }
  return messages
}

const createMockQueueMessage = <T>(body: T, id = 'msg-queue-1', attempts = 1) => ({
  id,
  timestamp: new Date(),
  body,
  attempts,
  ack: vi.fn(),
  retry: vi.fn(),
})

const createMockMessageBatch = (messages: any[], queueName = 'copas-whatsapp') => ({
  queue: queueName,
  messages,
  ackAll: vi.fn(),
  retryAll: vi.fn(),
})

// --- Suite Definition ---

describe('whatsapp-service Worker Test Suite', () => {
  let mockEnv: ReturnType<typeof createMockEnv>
  let mockCtx: ReturnType<typeof createMockCtx>

  beforeEach(() => {
    mockEnv = createMockEnv()
    mockCtx = createMockCtx()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // =========================================================================
  // 1. GET /health
  // =========================================================================
  describe('GET /health', () => {
    it('returns 200 OK with status and service metadata', async () => {
      const res = await dispatchHttp('/health', { method: 'GET' }, mockEnv, mockCtx)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual({
        status: 'ok',
        service: 'whatsapp-service',
      })
    })

    it('sets Content-Type to application/json', async () => {
      const res = await dispatchHttp('/health', { method: 'GET' }, mockEnv, mockCtx)

      expect(res.headers.get('content-type')).toContain('application/json')
    })
  })

  // =========================================================================
  // 2. GET /webhooks/whatsapp (Subscription Verification)
  // =========================================================================
  describe('GET /webhooks/whatsapp - Subscription Verification', () => {
    it('returns 200 OK with hub.challenge as plain text when mode and verify_token match', async () => {
      const challenge = 'challenge_security_string_987654321'
      const query = new URLSearchParams({
        'hub.mode': 'subscribe',
        'hub.verify_token': TEST_VERIFY_TOKEN,
        'hub.challenge': challenge,
      }).toString()

      const res = await dispatchHttp(`/webhooks/whatsapp?${query}`, { method: 'GET' }, mockEnv, mockCtx)

      expect(res.status).toBe(200)
      const bodyText = await res.text()
      expect(bodyText).toBe(challenge)
    })

    it('returns 403 Forbidden when hub.verify_token is incorrect', async () => {
      const query = new URLSearchParams({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong_invalid_token',
        'hub.challenge': 'test_challenge',
      }).toString()

      const res = await dispatchHttp(`/webhooks/whatsapp?${query}`, { method: 'GET' }, mockEnv, mockCtx)

      expect(res.status).toBe(403)
    })

    it('returns 403 Forbidden when hub.mode is not "subscribe"', async () => {
      const query = new URLSearchParams({
        'hub.mode': 'publish',
        'hub.verify_token': TEST_VERIFY_TOKEN,
        'hub.challenge': 'test_challenge',
      }).toString()

      const res = await dispatchHttp(`/webhooks/whatsapp?${query}`, { method: 'GET' }, mockEnv, mockCtx)

      expect(res.status).toBe(403)
    })

    it('returns 403 Forbidden when hub.mode is missing', async () => {
      const query = new URLSearchParams({
        'hub.verify_token': TEST_VERIFY_TOKEN,
        'hub.challenge': 'test_challenge',
      }).toString()

      const res = await dispatchHttp(`/webhooks/whatsapp?${query}`, { method: 'GET' }, mockEnv, mockCtx)

      expect(res.status).toBe(403)
    })

    it('returns 403 Forbidden when hub.verify_token is missing', async () => {
      const query = new URLSearchParams({
        'hub.mode': 'subscribe',
        'hub.challenge': 'test_challenge',
      }).toString()

      const res = await dispatchHttp(`/webhooks/whatsapp?${query}`, { method: 'GET' }, mockEnv, mockCtx)

      expect(res.status).toBe(403)
    })

    it('returns 403 Forbidden when query string is empty', async () => {
      const res = await dispatchHttp('/webhooks/whatsapp', { method: 'GET' }, mockEnv, mockCtx)

      expect(res.status).toBe(403)
    })
  })

  // =========================================================================
  // 3. POST /webhooks/whatsapp (Webhook Events Ingestion)
  // =========================================================================
  describe('POST /webhooks/whatsapp - Webhook Ingestion', () => {
    const createBaseWebhookPayload = (changeValue: Record<string, unknown>) => ({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID_1',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '1234567890',
                  phone_number_id: TEST_PHONE_NUMBER_ID,
                },
                ...changeValue,
              },
              field: 'messages',
            },
          ],
        },
      ],
    })

    describe('HMAC-SHA256 Signature Verification', () => {
      it('returns 401 Unauthorized when X-Hub-Signature-256 header is absent', async () => {
        const payload = createBaseWebhookPayload({ messages: [] })
        const rawBody = JSON.stringify(payload)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(401)
      })

      it('returns 401 Unauthorized when signature does not match secret HMAC', async () => {
        const payload = createBaseWebhookPayload({ messages: [] })
        const rawBody = JSON.stringify(payload)
        const invalidSignature = generateHmacSignature(rawBody, 'different_wrong_secret')

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': invalidSignature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(401)
      })

      it('returns 401 Unauthorized when signature is malformed without sha256 prefix', async () => {
        const payload = createBaseWebhookPayload({ messages: [] })
        const rawBody = JSON.stringify(payload)
        const malformedSignature = 'bad_signature_format'

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': malformedSignature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(401)
      })

      it('returns 200 OK and accepts payload when signature is valid', async () => {
        const payload = createBaseWebhookPayload({ messages: [] })
        const rawBody = JSON.stringify(payload)
        const validSignature = generateHmacSignature(rawBody, TEST_APP_SECRET)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': validSignature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json).toMatchObject({ success: true })
      })
    })

    describe('Inbound Message Normalization & Atomic Decomposition', () => {
      it('normalizes and enqueues text messages with BSUID and senderName', async () => {
        const webhookPayload = createBaseWebhookPayload({
          contacts: [
            {
              profile: { name: 'Juan Perez' },
              wa_id: '5491112345678',
              user_id: 'bsuid_user_juan_001',
            },
          ],
          messages: [
            {
              from: '5491112345678',
              id: 'wamid.HBgLTEXT001',
              timestamp: '1726050000',
              type: 'text',
              text: {
                body: 'Hola, quiero consultar el vencimiento de mi cuota',
              },
            },
          ],
        })

        const rawBody = JSON.stringify(webhookPayload)
        const signature = generateHmacSignature(rawBody)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': signature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(200)
        const enqueued = extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)
        expect(enqueued).toHaveLength(1)

        const msg: WhatsAppInboundMessageQueueMessage = enqueued[0]
        expect(msg.type).toBe('whatsapp-inbound-message')
        expect(msg.metadata?.idempotencyKey).toBe('inbound:msg:wamid.HBgLTEXT001')
        expect(msg.payload).toEqual({
          wamid: 'wamid.HBgLTEXT001',
          phoneNumberId: TEST_PHONE_NUMBER_ID,
          from: '5491112345678',
          bsuid: 'bsuid_user_juan_001',
          senderName: 'Juan Perez',
          timestamp: 1726050000,
          type: 'text',
          text: 'Hola, quiero consultar el vencimiento de mi cuota',
        })
      })

      it('normalizes and enqueues image media messages', async () => {
        const webhookPayload = createBaseWebhookPayload({
          contacts: [{ profile: { name: 'Maria Gomez' }, wa_id: '5491187654321' }],
          messages: [
            {
              from: '5491187654321',
              id: 'wamid.HBgLIMG002',
              timestamp: '1726050005',
              type: 'image',
              image: {
                id: 'media_img_id_123',
                mime_type: 'image/jpeg',
                sha256: 'sha256_hash_image_sample',
                caption: 'Foto de comprobante',
              },
            },
          ],
        })

        const rawBody = JSON.stringify(webhookPayload)
        const signature = generateHmacSignature(rawBody)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': signature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(200)
        const enqueued = extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)
        expect(enqueued).toHaveLength(1)

        const msg: WhatsAppInboundMessageQueueMessage = enqueued[0]
        expect(msg.type).toBe('whatsapp-inbound-message')
        expect(msg.payload.type).toBe('image')
        expect(msg.payload.media).toEqual({
          id: 'media_img_id_123',
          mimeType: 'image/jpeg',
          sha256: 'sha256_hash_image_sample',
          caption: 'Foto de comprobante',
        })
      })

      it('normalizes and enqueues document media messages', async () => {
        const webhookPayload = createBaseWebhookPayload({
          contacts: [{ profile: { name: 'Carlos Ruiz' }, wa_id: '5491122334455' }],
          messages: [
            {
              from: '5491122334455',
              id: 'wamid.HBgLDOC003',
              timestamp: '1726050010',
              type: 'document',
              document: {
                id: 'media_doc_id_456',
                mime_type: 'application/pdf',
                filename: 'poliza_firmada.pdf',
                caption: 'Póliza firmada',
              },
            },
          ],
        })

        const rawBody = JSON.stringify(webhookPayload)
        const signature = generateHmacSignature(rawBody)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': signature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(200)
        const enqueued = extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)
        expect(enqueued).toHaveLength(1)

        const msg: WhatsAppInboundMessageQueueMessage = enqueued[0]
        expect(msg.payload.type).toBe('document')
        expect(msg.payload.media).toEqual({
          id: 'media_doc_id_456',
          mimeType: 'application/pdf',
          filename: 'poliza_firmada.pdf',
          caption: 'Póliza firmada',
        })
      })

      it('normalizes and enqueues audio media messages', async () => {
        const webhookPayload = createBaseWebhookPayload({
          contacts: [{ profile: { name: 'Laura Sanchez' }, wa_id: '5491199887766' }],
          messages: [
            {
              from: '5491199887766',
              id: 'wamid.HBgLAUD004',
              timestamp: '1726050015',
              type: 'audio',
              audio: {
                id: 'media_aud_id_789',
                mime_type: 'audio/ogg; codecs=opus',
              },
            },
          ],
        })

        const rawBody = JSON.stringify(webhookPayload)
        const signature = generateHmacSignature(rawBody)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': signature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(200)
        const enqueued = extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)
        expect(enqueued).toHaveLength(1)

        const msg: WhatsAppInboundMessageQueueMessage = enqueued[0]
        expect(msg.payload.type).toBe('audio')
        expect(msg.payload.media).toEqual({
          id: 'media_aud_id_789',
          mimeType: 'audio/ogg; codecs=opus',
        })
      })

      it('normalizes and enqueues interactive button_reply messages', async () => {
        const webhookPayload = createBaseWebhookPayload({
          contacts: [{ profile: { name: 'Juan Perez' }, wa_id: '5491112345678' }],
          messages: [
            {
              from: '5491112345678',
              id: 'wamid.HBgLBTN005',
              timestamp: '1726050020',
              type: 'interactive',
              interactive: {
                type: 'button_reply',
                button_reply: {
                  id: 'btn_confirm_payment',
                  title: 'Confirmar Pago',
                },
              },
            },
          ],
        })

        const rawBody = JSON.stringify(webhookPayload)
        const signature = generateHmacSignature(rawBody)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': signature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(200)
        const enqueued = extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)
        expect(enqueued).toHaveLength(1)

        const msg: WhatsAppInboundMessageQueueMessage = enqueued[0]
        expect(msg.payload.type).toBe('interactive')
        expect(msg.payload.interactive).toEqual({
          type: 'button_reply',
          buttonReply: {
            id: 'btn_confirm_payment',
            title: 'Confirmar Pago',
          },
        })
      })

      it('normalizes and enqueues interactive list_reply messages', async () => {
        const webhookPayload = createBaseWebhookPayload({
          contacts: [{ profile: { name: 'Juan Perez' }, wa_id: '5491112345678' }],
          messages: [
            {
              from: '5491112345678',
              id: 'wamid.HBgLLIST006',
              timestamp: '1726050025',
              type: 'interactive',
              interactive: {
                type: 'list_reply',
                list_reply: {
                  id: 'row_seguro_hogar',
                  title: 'Seguro de Hogar',
                  description: 'Cobertura integral para vivienda',
                },
              },
            },
          ],
        })

        const rawBody = JSON.stringify(webhookPayload)
        const signature = generateHmacSignature(rawBody)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': signature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(200)
        const enqueued = extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)
        expect(enqueued).toHaveLength(1)

        const msg: WhatsAppInboundMessageQueueMessage = enqueued[0]
        expect(msg.payload.type).toBe('interactive')
        expect(msg.payload.interactive).toEqual({
          type: 'list_reply',
          listReply: {
            id: 'row_seguro_hogar',
            title: 'Seguro de Hogar',
            description: 'Cobertura integral para vivienda',
          },
        })
      })

      it('normalizes and enqueues interactive nfm_reply (WhatsApp Flows) with parsed JSON', async () => {
        const flowResponseData = {
          flow_token: 'flw_token_abc_123',
          screen_id: 'CONFIRMATION',
          selected_date: '2026-09-15',
          installment_number: 3,
        }

        const webhookPayload = createBaseWebhookPayload({
          contacts: [{ profile: { name: 'Juan Perez' }, wa_id: '5491112345678' }],
          messages: [
            {
              from: '5491112345678',
              id: 'wamid.HBgLFLOW007',
              timestamp: '1726050030',
              type: 'interactive',
              interactive: {
                type: 'nfm_reply',
                nfm_reply: {
                  response_json: JSON.stringify(flowResponseData),
                  body: 'Formulario de reprogramación completado',
                },
              },
            },
          ],
        })

        const rawBody = JSON.stringify(webhookPayload)
        const signature = generateHmacSignature(rawBody)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': signature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(200)
        const enqueued = extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)
        expect(enqueued).toHaveLength(1)

        const msg: WhatsAppInboundMessageQueueMessage = enqueued[0]
        expect(msg.payload.type).toBe('interactive')
        expect(msg.payload.interactive).toEqual({
          type: 'nfm_reply',
          flowReply: {
            responseJson: flowResponseData,
            body: 'Formulario de reprogramación completado',
          },
        })
      })

      it('normalizes unsupported message types as "unknown"', async () => {
        const webhookPayload = createBaseWebhookPayload({
          contacts: [{ profile: { name: 'Juan Perez' }, wa_id: '5491112345678' }],
          messages: [
            {
              from: '5491112345678',
              id: 'wamid.HBgLSTICKER008',
              timestamp: '1726050035',
              type: 'sticker',
              sticker: {
                id: 'stk_id_123',
                mime_type: 'image/webp',
              },
            },
          ],
        })

        const rawBody = JSON.stringify(webhookPayload)
        const signature = generateHmacSignature(rawBody)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': signature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(200)
        const enqueued = extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)
        expect(enqueued).toHaveLength(1)

        const msg: WhatsAppInboundMessageQueueMessage = enqueued[0]
        expect(msg.payload.type).toBe('unknown')
      })

      it('handles inbound message when sender contact lacks BSUID (user_id is undefined)', async () => {
        const webhookPayload = createBaseWebhookPayload({
          contacts: [{ profile: { name: 'Anon User' }, wa_id: '5491100001111' }],
          messages: [
            {
              from: '5491100001111',
              id: 'wamid.NOBSUID001',
              timestamp: '1726050038',
              type: 'text',
              text: { body: 'Mensaje sin BSUID' },
            },
          ],
        })

        const rawBody = JSON.stringify(webhookPayload)
        const signature = generateHmacSignature(rawBody)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': signature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(200)
        const enqueued = extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)
        expect(enqueued).toHaveLength(1)
        expect(enqueued[0].payload.bsuid).toBeUndefined()
      })

      it('atomically decomposes and enqueues multiple messages from a single webhook entry', async () => {
        const webhookPayload = createBaseWebhookPayload({
          contacts: [{ profile: { name: 'Multiple Sender' }, wa_id: '5491155554444' }],
          messages: [
            {
              from: '5491155554444',
              id: 'wamid.MULTI001',
              timestamp: '1726050040',
              type: 'text',
              text: { body: 'Primer mensaje del lote' },
            },
            {
              from: '5491155554444',
              id: 'wamid.MULTI002',
              timestamp: '1726050041',
              type: 'text',
              text: { body: 'Segundo mensaje del lote' },
            },
          ],
        })

        const rawBody = JSON.stringify(webhookPayload)
        const signature = generateHmacSignature(rawBody)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': signature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(200)
        const enqueued = extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)
        expect(enqueued).toHaveLength(2)

        const wamids = enqueued.map((m: WhatsAppInboundMessageQueueMessage) => m.payload.wamid)
        expect(wamids).toEqual(['wamid.MULTI001', 'wamid.MULTI002'])
      })
    })

    describe('Status Updates Decomposition & Normalization', () => {
      it('normalizes and enqueues sent, delivered, and read status updates', async () => {
        const webhookPayload = createBaseWebhookPayload({
          statuses: [
            {
              id: 'wamid.OUT001',
              status: 'sent',
              timestamp: '1726050100',
              recipient_id: '5491112345678',
              recipient_user_id: 'bsuid_recip_999',
            },
            {
              id: 'wamid.OUT002',
              status: 'delivered',
              timestamp: '1726050105',
              recipient_id: '5491112345678',
            },
            {
              id: 'wamid.OUT003',
              status: 'read',
              timestamp: '1726050110',
              recipient_id: '5491112345678',
            },
          ],
        })

        const rawBody = JSON.stringify(webhookPayload)
        const signature = generateHmacSignature(rawBody)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': signature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(200)
        const enqueued = extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)
        expect(enqueued).toHaveLength(3)

        const firstStatus: WhatsAppStatusUpdateQueueMessage = enqueued[0]
        expect(firstStatus.type).toBe('whatsapp-status-update')
        expect(firstStatus.metadata?.idempotencyKey).toBe('inbound:status:wamid.OUT001:sent')
        expect(firstStatus.payload).toEqual({
          wamid: 'wamid.OUT001',
          phoneNumberId: TEST_PHONE_NUMBER_ID,
          recipientPhone: '5491112345678',
          recipientUserId: 'bsuid_recip_999',
          status: 'sent',
          timestamp: 1726050100,
        })

        expect(enqueued[1].payload.status).toBe('delivered')
        expect(enqueued[1].metadata?.idempotencyKey).toBe('inbound:status:wamid.OUT002:delivered')

        expect(enqueued[2].payload.status).toBe('read')
        expect(enqueued[2].metadata?.idempotencyKey).toBe('inbound:status:wamid.OUT003:read')
      })

      it('normalizes failed status update including Meta error details', async () => {
        const webhookPayload = createBaseWebhookPayload({
          statuses: [
            {
              id: 'wamid.FAIL001',
              status: 'failed',
              timestamp: '1726050120',
              recipient_id: '5491112345678',
              errors: [
                {
                  code: 131047,
                  title: 'Message Undeliverable',
                  message: 'Re-engagement message needed. More than 24 hours have elapsed.',
                  error_data: {
                    details: 'Conversation window expired.',
                  },
                },
              ],
            },
          ],
        })

        const rawBody = JSON.stringify(webhookPayload)
        const signature = generateHmacSignature(rawBody)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': signature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(200)
        const enqueued = extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)
        expect(enqueued).toHaveLength(1)

        const failedStatus: WhatsAppStatusUpdateQueueMessage = enqueued[0]
        expect(failedStatus.type).toBe('whatsapp-status-update')
        expect(failedStatus.payload.status).toBe('failed')
        expect(failedStatus.payload.errors).toEqual([
          {
            code: 131047,
            title: 'Message Undeliverable',
            message: 'Re-engagement message needed. More than 24 hours have elapsed.',
            errorData: {
              details: 'Conversation window expired.',
            },
          },
        ])
      })
    })

    describe('Resilience and Queue Failure Behavior', () => {
      it('returns 500 when queue sendBatch fails so Meta can retry the webhook', async () => {
        mockEnv.WHATSAPP_INBOUND_QUEUE.sendBatch.mockRejectedValueOnce(new Error('Cloudflare Queue Outage'))

        const webhookPayload = createBaseWebhookPayload({
          messages: [
            {
              from: '5491112345678',
              id: 'wamid.ERR001',
              timestamp: '1726050200',
              type: 'text',
              text: { body: 'Mensaje con fallo de cola' },
            },
          ],
        })

        const rawBody = JSON.stringify(webhookPayload)
        const signature = generateHmacSignature(rawBody)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': signature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBeGreaterThanOrEqual(500)
      })

      it('returns 200 OK without failing when payload contains neither messages nor statuses', async () => {
        const webhookPayload = createBaseWebhookPayload({})
        const rawBody = JSON.stringify(webhookPayload)
        const signature = generateHmacSignature(rawBody)

        const res = await dispatchHttp(
          '/webhooks/whatsapp',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': signature,
            },
            body: rawBody,
          },
          mockEnv,
          mockCtx,
        )

        expect(res.status).toBe(200)
        const enqueued = extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)
        expect(enqueued).toHaveLength(0)
      })
    })
  })

  // =========================================================================
  // 4. Outbound Queue Consumer (queue(batch, env, ctx))
  // =========================================================================
  describe('Outbound Queue Consumer (queue handler)', () => {
    const createOutboundEnvelope = (
      payloadOverrides?: Partial<WhatsAppOutboundQueueMessage['payload']>,
    ): WhatsAppOutboundQueueMessage => ({
      type: 'whatsapp-outbound',
      metadata: {
        organizationId: 'org_test_100',
        idempotencyKey: 'outbound:msg-dispatch-001',
      },
      payload: {
        messageId: '018f9e2b-1111-7000-8000-000000000001',
        conversationId: '018f9e2b-2222-7000-8000-000000000002',
        organizationId: 'org_test_100',
        organizationChannelEndpointId: 'cep_test_001',
        phoneNumberId: TEST_PHONE_NUMBER_ID,
        to: '+5491112345678',
        mode: 'template',
        credentials: {
          accessToken: TEST_ACCESS_TOKEN,
          wabaId: 'waba_id_test_999',
        },
        ...payloadOverrides,
      },
    })

    describe('Meta Graph API Endpoint and Headers Contract', () => {
      it('sends POST request to correct Meta Graph API URL with Bearer accessToken', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
          new Response(JSON.stringify({ messages: [{ id: 'wamid.HBgLSUCCESS001' }] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )

        const outboundMsg = createOutboundEnvelope({
          mode: 'free_form',
          text: 'Mensaje de prueba de URL',
        })
        const mockQueueMsg = createMockQueueMessage(outboundMsg)
        const batch = createMockMessageBatch([mockQueueMsg])

        await dispatchQueue(batch, mockEnv, mockCtx)

        expect(fetchSpy).toHaveBeenCalledTimes(1)
        const [targetUrl, requestOptions] = fetchSpy.mock.calls[0]

        expect(targetUrl).toBe(
          `https://graph.facebook.com/v20.0/${TEST_PHONE_NUMBER_ID}/messages`,
        )
        expect(requestOptions?.method).toBe('POST')
        const headers = requestOptions?.headers as Record<string, string>
        expect(headers['Authorization']).toBe(`Bearer ${TEST_ACCESS_TOKEN}`)
        expect(headers['Content-Type']).toBe('application/json')
        expect(mockQueueMsg.ack).toHaveBeenCalledTimes(1)
      })
    })

    describe('Supported Dispatch Modes (5 Modes)', () => {
      it('dispatches mode "template" with HSM parameters', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
          new Response(JSON.stringify({ messages: [{ id: 'wamid.TEMPLATE_OK' }] }), {
            status: 200,
          }),
        )

        const outboundMsg = createOutboundEnvelope({
          mode: 'template',
          template: {
            name: 'cuota_vencimiento_aviso_previo',
            language: { code: 'es_AR' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: 'Martín Palermo' },
                  { type: 'currency', currency: { code: 'ARS', amount_1000: 25000000, fallback_value: '$25.000' } },
                ],
              },
            ],
          },
        })

        const mockQueueMsg = createMockQueueMessage(outboundMsg)
        const batch = createMockMessageBatch([mockQueueMsg])

        await dispatchQueue(batch, mockEnv, mockCtx)

        const [, options] = fetchSpy.mock.calls[0]
        const body = JSON.parse(options?.body as string)

        expect(body).toEqual({
          messaging_product: 'whatsapp',
          to: '+5491112345678',
          type: 'template',
          template: {
            name: 'cuota_vencimiento_aviso_previo',
            language: { code: 'es_AR' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: 'Martín Palermo' },
                  { type: 'currency', currency: { code: 'ARS', amount_1000: 25000000, fallback_value: '$25.000' } },
                ],
              },
            ],
          },
        })
        expect(mockQueueMsg.ack).toHaveBeenCalled()
      })

      it('dispatches mode "free_form" with preview_url false', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
          new Response(JSON.stringify({ messages: [{ id: 'wamid.TEXT_OK' }] }), {
            status: 200,
          }),
        )

        const outboundMsg = createOutboundEnvelope({
          mode: 'free_form',
          text: 'Estimado asegurado, su consulta ha sido procesada con éxito.',
        })

        const mockQueueMsg = createMockQueueMessage(outboundMsg)
        const batch = createMockMessageBatch([mockQueueMsg])

        await dispatchQueue(batch, mockEnv, mockCtx)

        const [, options] = fetchSpy.mock.calls[0]
        const body = JSON.parse(options?.body as string)

        expect(body).toEqual({
          messaging_product: 'whatsapp',
          to: '+5491112345678',
          type: 'text',
          text: {
            preview_url: false,
            body: 'Estimado asegurado, su consulta ha sido procesada con éxito.',
          },
        })
        expect(mockQueueMsg.ack).toHaveBeenCalled()
      })

      it('dispatches mode "reaction" referencing target messageId and emoji', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
          new Response(JSON.stringify({ messages: [{ id: 'wamid.REACTION_OK' }] }), {
            status: 200,
          }),
        )

        const outboundMsg = createOutboundEnvelope({
          mode: 'reaction',
          reaction: {
            messageId: 'wamid.TARGET_MSG_001',
            emoji: '👍',
          },
        })

        const mockQueueMsg = createMockQueueMessage(outboundMsg)
        const batch = createMockMessageBatch([mockQueueMsg])

        await dispatchQueue(batch, mockEnv, mockCtx)

        const [, options] = fetchSpy.mock.calls[0]
        const body = JSON.parse(options?.body as string)

        expect(body).toEqual({
          messaging_product: 'whatsapp',
          to: '+5491112345678',
          type: 'reaction',
          reaction: {
            message_id: 'wamid.TARGET_MSG_001',
            emoji: '👍',
          },
        })
        expect(mockQueueMsg.ack).toHaveBeenCalled()
      })

      it('dispatches mode "contact" with vCard array', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
          new Response(JSON.stringify({ messages: [{ id: 'wamid.CONTACT_OK' }] }), {
            status: 200,
          }),
        )

        const contactData = {
          name: {
            formatted_name: 'Atención al Cliente Copas',
            first_name: 'Atención',
            last_name: 'Copas',
          },
          phones: [
            {
              phone: '+5491199998888',
              type: 'WORK',
            },
          ],
          emails: [
            {
              email: 'soporte@copas.com',
              type: 'WORK',
            },
          ],
        }

        const outboundMsg = createOutboundEnvelope({
          mode: 'contact',
          contact: contactData,
        })

        const mockQueueMsg = createMockQueueMessage(outboundMsg)
        const batch = createMockMessageBatch([mockQueueMsg])

        await dispatchQueue(batch, mockEnv, mockCtx)

        const [, options] = fetchSpy.mock.calls[0]
        const body = JSON.parse(options?.body as string)

        expect(body).toEqual({
          messaging_product: 'whatsapp',
          to: '+5491112345678',
          type: 'contacts',
          contacts: [contactData],
        })
        expect(mockQueueMsg.ack).toHaveBeenCalled()
      })

      it('dispatches mode "interactive" with interactive payload', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
          new Response(JSON.stringify({ messages: [{ id: 'wamid.INTERACTIVE_OK' }] }), {
            status: 200,
          }),
        )

        const interactiveData = {
          type: 'button' as const,
          header: {
            type: 'text' as const,
            text: 'Confirmación de Trámite',
          },
          body: {
            text: '¿Desea solicitar el comprobante fiscal de pago?',
          },
          footer: {
            text: 'Copas Seguros',
          },
          action: {
            buttons: [
              {
                type: 'reply' as const,
                reply: {
                  id: 'btn_yes_comprobante',
                  title: 'Sí, enviar',
                },
              },
              {
                type: 'reply' as const,
                reply: {
                  id: 'btn_no_comprobante',
                  title: 'No, gracias',
                },
              },
            ],
          },
        }

        const outboundMsg = createOutboundEnvelope({
          mode: 'interactive',
          interactive: interactiveData,
        })

        const mockQueueMsg = createMockQueueMessage(outboundMsg)
        const batch = createMockMessageBatch([mockQueueMsg])

        await dispatchQueue(batch, mockEnv, mockCtx)

        const [, options] = fetchSpy.mock.calls[0]
        const body = JSON.parse(options?.body as string)

        expect(body).toEqual({
          messaging_product: 'whatsapp',
          to: '+5491112345678',
          type: 'interactive',
          interactive: interactiveData,
        })
        expect(mockQueueMsg.ack).toHaveBeenCalled()
      })
    })

    describe('Transient Failures and Retry Handling', () => {
      it('invokes msg.retry() and does NOT call ack() on HTTP 429 Rate Limit', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
          new Response(JSON.stringify({ error: { message: 'Rate limit hit', code: 4 } }), {
            status: 429,
            statusText: 'Too Many Requests',
          }),
        )

        const outboundMsg = createOutboundEnvelope({
          mode: 'free_form',
          text: 'Mensaje que sufrirá rate limit',
        })

        const mockQueueMsg = createMockQueueMessage(outboundMsg)
        const batch = createMockMessageBatch([mockQueueMsg])

        await dispatchQueue(batch, mockEnv, mockCtx)

        expect(mockQueueMsg.retry).toHaveBeenCalledTimes(1)
        expect(mockQueueMsg.ack).not.toHaveBeenCalled()
        expect(extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)).toHaveLength(0)
      })

      it('invokes msg.retry() and does NOT call ack() on HTTP 5xx Server Error', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
          new Response('Internal Server Error in Meta Graph API', {
            status: 500,
            statusText: 'Internal Server Error',
          }),
        )

        const outboundMsg = createOutboundEnvelope({
          mode: 'free_form',
          text: 'Mensaje con fallo 500',
        })

        const mockQueueMsg = createMockQueueMessage(outboundMsg)
        const batch = createMockMessageBatch([mockQueueMsg])

        await dispatchQueue(batch, mockEnv, mockCtx)

        expect(mockQueueMsg.retry).toHaveBeenCalledTimes(1)
        expect(mockQueueMsg.ack).not.toHaveBeenCalled()
        expect(extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)).toHaveLength(0)
      })

      it('invokes msg.retry() when network fetch throws an error (e.g. timeout)', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection timed out to Meta Graph API'))

        const outboundMsg = createOutboundEnvelope({
          mode: 'free_form',
          text: 'Mensaje con caída de conexión',
        })

        const mockQueueMsg = createMockQueueMessage(outboundMsg)
        const batch = createMockMessageBatch([mockQueueMsg])

        await dispatchQueue(batch, mockEnv, mockCtx)

        expect(mockQueueMsg.retry).toHaveBeenCalledTimes(1)
        expect(mockQueueMsg.ack).not.toHaveBeenCalled()
      })
    })

    describe('Non-recoverable Failures & Fallback to Inbound Queue (HTTP 4xx)', () => {
      it('invokes msg.ack() and enqueues WhatsAppStatusUpdateQueueMessage to inbound queue when 24h window has expired (131047)', async () => {
        const metaErrorResponse = {
          error: {
            message: 'Re-engagement message needed. More than 24 hours have elapsed.',
            type: 'OAuthException',
            code: 131047,
            error_data: {
              details: 'Conversation window expired.',
            },
          },
        }

        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
          new Response(JSON.stringify(metaErrorResponse), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }),
        )

        const outboundMsg = createOutboundEnvelope({
          mode: 'free_form',
          messageId: 'msg_uuid_expired_24h',
          text: 'Mensaje fuera de ventana',
        })

        const mockQueueMsg = createMockQueueMessage(outboundMsg)
        const batch = createMockMessageBatch([mockQueueMsg])

        await dispatchQueue(batch, mockEnv, mockCtx)

        // Must ack to remove from outbound queue
        expect(mockQueueMsg.ack).toHaveBeenCalledTimes(1)
        expect(mockQueueMsg.retry).not.toHaveBeenCalled()

        // Must notify inbound queue of failure
        const inboundEnqueued = extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)
        expect(inboundEnqueued).toHaveLength(1)

        const statusUpdate: WhatsAppStatusUpdateQueueMessage = inboundEnqueued[0]
        expect(statusUpdate.type).toBe('whatsapp-status-update')
        expect(statusUpdate.metadata?.idempotencyKey).toBe('failed-dispatch:msg_uuid_expired_24h')
        expect(statusUpdate.payload).toMatchObject({
          wamid: 'failed:msg_uuid_expired_24h',
          phoneNumberId: TEST_PHONE_NUMBER_ID,
          recipientPhone: '+5491112345678',
          status: 'failed',
          errors: [
            {
              code: 131047,
              title: 'OAuthException',
              message: 'Re-engagement message needed. More than 24 hours have elapsed.',
              errorData: {
                details: 'Conversation window expired.',
              },
            },
          ],
        })
        expect(statusUpdate.payload.timestamp).toBeGreaterThan(0)
      })

      it('invokes msg.ack() and notifies inbound queue on HTTP 401 Invalid Token', async () => {
        const metaErrorResponse = {
          error: {
            message: 'Invalid OAuth access token.',
            type: 'OAuthException',
            code: 190,
          },
        }

        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
          new Response(JSON.stringify(metaErrorResponse), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        )

        const outboundMsg = createOutboundEnvelope({
          messageId: 'msg_uuid_invalid_token',
        })

        const mockQueueMsg = createMockQueueMessage(outboundMsg)
        const batch = createMockMessageBatch([mockQueueMsg])

        await dispatchQueue(batch, mockEnv, mockCtx)

        expect(mockQueueMsg.ack).toHaveBeenCalledTimes(1)
        expect(mockQueueMsg.retry).not.toHaveBeenCalled()

        const inboundEnqueued = extractEnqueuedInboundMessages(mockEnv.WHATSAPP_INBOUND_QUEUE)
        expect(inboundEnqueued).toHaveLength(1)
        expect(inboundEnqueued[0].payload.status).toBe('failed')
        expect(inboundEnqueued[0].payload.errors?.[0]?.code).toBe(190)
      })
    })

    describe('Batch Processing Isolation', () => {
      it('handles independent message outcomes within the same batch (success vs retry)', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch')
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ messages: [{ id: 'wamid.SUCCESS' }] }), { status: 200 }),
          )
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ error: { code: 4 } }), { status: 429, statusText: 'Too Many Requests' }),
          )

        const msg1 = createMockQueueMessage(
          createOutboundEnvelope({ messageId: 'msg_batch_1', text: 'Mensaje 1 exitoso' }),
          'queue_msg_1',
        )
        const msg2 = createMockQueueMessage(
          createOutboundEnvelope({ messageId: 'msg_batch_2', text: 'Mensaje 2 rate limited' }),
          'queue_msg_2',
        )

        const batch = createMockMessageBatch([msg1, msg2])

        await dispatchQueue(batch, mockEnv, mockCtx)

        expect(fetchSpy).toHaveBeenCalledTimes(2)
        expect(msg1.ack).toHaveBeenCalledTimes(1)
        expect(msg1.retry).not.toHaveBeenCalled()

        expect(msg2.retry).toHaveBeenCalledTimes(1)
        expect(msg2.ack).not.toHaveBeenCalled()
      })
    })
  })
})