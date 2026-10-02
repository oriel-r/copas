import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createWhatsAppDispatchService } from './whatsapp-dispatch.service'
import type { WhatsAppOutboundQueueMessage } from '@copas/contracts'

describe('whatsapp-dispatch.service', () => {
  let mockQueue: any
  let service: ReturnType<typeof createWhatsAppDispatchService>

  beforeEach(() => {
    mockQueue = {
      send: vi.fn().mockResolvedValue(undefined),
    }
    service = createWhatsAppDispatchService({ queue: mockQueue } as any)
  })

  describe('constructor and dependency injection', () => {
    it('should initialize with object containing queue', () => {
      const s = createWhatsAppDispatchService({ queue: mockQueue } as any)
      expect(s).toBeDefined()
      expect(typeof s.enqueueTemplateReminder).toBe('function')
    })

    it('should initialize with positional queue argument', () => {
      const s = createWhatsAppDispatchService(mockQueue as any)
      expect(s).toBeDefined()
      expect(typeof s.enqueueTemplateReminder).toBe('function')
    })
  })

  describe('enqueueTemplateReminder', () => {
    it('should format WhatsAppOutboundQueuePayload correctly and push envelope to queue', async () => {
      const dispatchInput = {
        messageId: '018f9e2b-1111-7000-8000-000000000001',
        conversationId: '018f9e2b-2222-7000-8000-000000000002',
        organizationId: '018f9e2b-3333-7000-8000-000000000003',
        organizationChannelEndpointId: '018f9e2b-4444-7000-8000-000000000004',
        phoneNumberId: '10987654321',
        to: '+5491112345678',
        templateName: 'cuota_vencimiento_aviso_previo',
        languageCode: 'es_AR',
        credentials: {
          accessToken: 'EAAB_test_token',
          wabaId: 'waba_123',
        },
      }

      await service.enqueueTemplateReminder(dispatchInput as any)

      expect(mockQueue.send).toHaveBeenCalledTimes(1)
      const sentEnvelope: WhatsAppOutboundQueueMessage = mockQueue.send.mock.calls[0][0]

      expect(sentEnvelope.type).toBe('whatsapp-outbound')
      expect(sentEnvelope.payload).toEqual({
        messageId: dispatchInput.messageId,
        conversationId: dispatchInput.conversationId,
        organizationId: dispatchInput.organizationId,
        organizationChannelEndpointId: dispatchInput.organizationChannelEndpointId,
        phoneNumberId: dispatchInput.phoneNumberId,
        to: dispatchInput.to,
        mode: 'template',
        template: {
          name: 'cuota_vencimiento_aviso_previo',
          language: { code: 'es_AR' },
        },
        credentials: {
          accessToken: 'EAAB_test_token',
          wabaId: 'waba_123',
        },
      })
      expect(sentEnvelope.metadata).toEqual({
        organizationId: '018f9e2b-3333-7000-8000-000000000003',
        idempotencyKey: '018f9e2b-3333-7000-8000-000000000003:018f9e2b-1111-7000-8000-000000000001',
      })
    })

    it('should include components in template when components are provided', async () => {
      const components = [
        {
          type: 'body' as const,
          parameters: [{ type: 'text' as const, text: 'JUAN PEREZ' }],
        },
      ]
      const dispatchInput = {
        messageId: 'msg-comp-1',
        conversationId: 'conv-comp-1',
        organizationId: 'org-comp-1',
        organizationChannelEndpointId: 'cep-comp-1',
        phoneNumberId: 'phone-comp-1',
        to: '+5491100000000',
        templateName: 'template_with_components',
        languageCode: 'es',
        components,
        credentials: { accessToken: 'token' },
      }

      await service.enqueueTemplateReminder(dispatchInput as any)

      const sentEnvelope: WhatsAppOutboundQueueMessage = mockQueue.send.mock.calls[0][0]
      expect(sentEnvelope.payload.template).toMatchObject({
        name: 'template_with_components',
        language: { code: 'es' },
      })
    })

    it('should propagate queue send failures with exact error message', async () => {
      mockQueue.send.mockRejectedValueOnce(new Error('Cloudflare Queue send failed'))

      const dispatchInput = {
        messageId: 'msg-fail',
        conversationId: 'conv-fail',
        organizationId: 'org-fail',
        organizationChannelEndpointId: 'cep-fail',
        phoneNumberId: 'phone-fail',
        to: '+5491199999999',
        templateName: 'template_fail',
        languageCode: 'es',
        credentials: { accessToken: 'token' },
      }

      await expect(service.enqueueTemplateReminder(dispatchInput as any)).rejects.toThrow(
        'Cloudflare Queue send failed',
      )
    })
  })
})
