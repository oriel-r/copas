import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMessagesService } from './messages.service'
import type { Message } from '@copas/contracts'

describe('messages.service', () => {
  let mockRepo: any
  let service: ReturnType<typeof createMessagesService>

  beforeEach(() => {
    mockRepo = {
      findByDeduplicationHash: vi.fn(),
      create: vi.fn(),
      createStatus: vi.fn(),
    }
    service = createMessagesService({ messagesRepository: mockRepo })
  })

  describe('constructor and dependency injection', () => {
    it('should initialize with object argument containing messagesRepository', () => {
      const s = createMessagesService({ messagesRepository: mockRepo })
      expect(s).toBeDefined()
      expect(typeof s.isAlreadySent).toBe('function')
      expect(typeof s.recordOutboundMessage).toBe('function')
    })

    it('should initialize with positional argument messagesRepository', () => {
      const s = createMessagesService(mockRepo as any)
      expect(s).toBeDefined()
      expect(typeof s.isAlreadySent).toBe('function')
      expect(typeof s.recordOutboundMessage).toBe('function')
    })
  })

  describe('isAlreadySent', () => {
    it('should return true when message exists for deduplicationHash', async () => {
      mockRepo.findByDeduplicationHash.mockResolvedValueOnce({ id: 'msg-1' })

      const result = await service.isAlreadySent('hash-123')
      expect(result).toBe(true)
      expect(mockRepo.findByDeduplicationHash).toHaveBeenCalledWith('hash-123')
    })

    it('should return false when no message exists for deduplicationHash', async () => {
      mockRepo.findByDeduplicationHash.mockResolvedValueOnce(null)

      const result = await service.isAlreadySent('hash-unique')
      expect(result).toBe(false)
      expect(mockRepo.findByDeduplicationHash).toHaveBeenCalledWith('hash-unique')
    })

    it('should propagate tx to findByDeduplicationHash if provided', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.findByDeduplicationHash.mockResolvedValueOnce(null)

      const result = await service.isAlreadySent('hash-tx', mockTx)
      expect(result).toBe(false)
      expect(mockRepo.findByDeduplicationHash).toHaveBeenCalledWith('hash-tx', mockTx)
    })
  })

  describe('recordOutboundMessage', () => {
    it('should record outbound message with status sent and create status entry', async () => {
      const input = {
        organizationId: 'org-1',
        conversationId: 'conv-1',
        channelEndpointId: 'cep-1',
        deduplicationHash: 'hash-sent',
        content: 'Recordatorio de cuota',
        status: 'sent' as const,
      }
      const createdMessage: Message = {
        id: 'msg-sent-1',
        organizationId: 'org-1',
        conversationId: 'conv-1',
        channelEndpointId: 'cep-1',
        direction: 'outbound',
        status: 'sent',
        content: input.content,
        rawPayload: null,
        metadata: {},
        deduplicationHash: input.deduplicationHash,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockRepo.create.mockResolvedValueOnce(createdMessage)
      mockRepo.createStatus.mockResolvedValueOnce(undefined)

      const result = await service.recordOutboundMessage(input as any)
      expect(result).toEqual(createdMessage)
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          conversationId: 'conv-1',
          direction: 'outbound',
          status: 'sent',
          content: {
            text: 'Recordatorio de cuota',
            templateId: undefined,
          },
          deduplicationHash: 'hash-sent',
        }),
      )
      expect(mockRepo.createStatus).toHaveBeenCalledWith('msg-sent-1', 'sent', undefined)
    })

    it('should record outbound message with status skipped and skipReason', async () => {
      const input = {
        organizationId: 'org-1',
        conversationId: 'conv-1',
        channelEndpointId: 'cep-1',
        deduplicationHash: 'hash-skipped',
        status: 'skipped' as const,
        skipReason: 'opt_out',
        metadata: { reason: 'opt_out' },
      }
      const skippedMessage: Message = {
        id: 'msg-skip-1',
        organizationId: 'org-1',
        conversationId: 'conv-1',
        channelEndpointId: 'cep-1',
        direction: 'outbound',
        status: 'skipped',
        content: null,
        rawPayload: null,
        metadata: { skipReason: 'opt_out' },
        deduplicationHash: input.deduplicationHash,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockRepo.create.mockResolvedValueOnce(skippedMessage)
      mockRepo.createStatus.mockResolvedValueOnce(undefined)

      const result = await service.recordOutboundMessage(input as any)
      expect(result).toEqual(skippedMessage)
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          conversationId: 'conv-1',
          direction: 'outbound',
          status: 'skipped',
          deduplicationHash: 'hash-skipped',
        }),
      )
      expect(mockRepo.createStatus).toHaveBeenCalledWith('msg-skip-1', 'skipped', { reason: 'opt_out' })
    })

    it('should propagate transaction tx when provided to both create and createStatus', async () => {
      const mockTx = { isTransaction: true } as any
      const input = {
        organizationId: 'org-1',
        conversationId: 'conv-1',
        channelEndpointId: 'cep-1',
        deduplicationHash: 'hash-tx',
        status: 'sent' as const,
      }
      mockRepo.create.mockResolvedValueOnce({ id: 'msg-tx' })
      mockRepo.createStatus.mockResolvedValueOnce(undefined)

      await service.recordOutboundMessage(input as any, mockTx)
      expect(mockRepo.create).toHaveBeenCalledWith(expect.anything(), mockTx)
      expect(mockRepo.createStatus).toHaveBeenCalledWith('msg-tx', 'sent', undefined, mockTx)
    })

    it('should pass templateId in content when provided', async () => {
      const input = {
        organizationId: 'org-1',
        conversationId: 'conv-1',
        channelEndpointId: 'cep-1',
        deduplicationHash: 'hash-template',
        content: 'Hola Juan, recordatorio',
        templateId: 'tmpl-100',
        status: 'sent' as const,
      }
      mockRepo.create.mockResolvedValueOnce({ id: 'msg-tmpl' })
      mockRepo.createStatus.mockResolvedValueOnce(undefined)

      await service.recordOutboundMessage(input as any)
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: {
            text: 'Hola Juan, recordatorio',
            templateId: 'tmpl-100',
          },
        }),
      )
    })
  })
})
