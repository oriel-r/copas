import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createConversationsService } from './conversations.service'
import type { Conversation } from '@copas/contracts'

describe('conversations.service', () => {
  let mockRepo: any
  let service: ReturnType<typeof createConversationsService>

  beforeEach(() => {
    mockRepo = {
      findOpenByInsuredAndEndpoint: vi.fn(),
      create: vi.fn(),
      linkEntity: vi.fn(),
    }
    service = createConversationsService({ conversationsRepository: mockRepo })
  })

  describe('constructor and dependency injection', () => {
    it('should initialize with object argument containing conversationsRepository', () => {
      const s = createConversationsService({ conversationsRepository: mockRepo })
      expect(s).toBeDefined()
      expect(typeof s.getOrCreateActiveConversation).toBe('function')
      expect(typeof s.linkEntityToConversation).toBe('function')
    })

    it('should initialize with positional argument conversationsRepository', () => {
      const s = createConversationsService(mockRepo as any)
      expect(s).toBeDefined()
      expect(typeof s.getOrCreateActiveConversation).toBe('function')
    })
  })

  describe('getOrCreateActiveConversation', () => {
    it('should reuse existing open conversation when found', async () => {
      const existingConv: Conversation = {
        id: 'conv-open-1',
        organizationId: 'org-1',
        channelEndpointId: 'cep-1',
        status: 'open',
        lastMessageAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockRepo.findOpenByInsuredAndEndpoint.mockResolvedValueOnce(existingConv)

      const result = await service.getOrCreateActiveConversation({
        organizationId: 'org-1',
        insuredId: 'ins-1',
        channelEndpointId: 'cep-1',
      } as any)

      expect(result).toEqual(existingConv)
      expect(mockRepo.findOpenByInsuredAndEndpoint).toHaveBeenCalledWith('ins-1', undefined)
      expect(mockRepo.create).not.toHaveBeenCalled()
    })

    it('should create a new conversation when no open conversation exists', async () => {
      const newConv: Conversation = {
        id: 'conv-new-1',
        organizationId: 'org-1',
        channelEndpointId: 'cep-1',
        status: 'open',
        lastMessageAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockRepo.findOpenByInsuredAndEndpoint.mockResolvedValueOnce(null)
      mockRepo.create.mockResolvedValueOnce(newConv)

      const result = await service.getOrCreateActiveConversation({
        organizationId: 'org-1',
        insuredId: 'ins-1',
        organizationChannelEndpointId: 'oce-1',
        type: 'reminder',
      } as any)

      expect(result).toEqual(newConv)
      expect(mockRepo.findOpenByInsuredAndEndpoint).toHaveBeenCalledWith('ins-1', 'oce-1')
      expect(mockRepo.create).toHaveBeenCalledWith({
        organizationId: 'org-1',
        organizationChannelEndpointId: 'oce-1',
        insuredId: 'ins-1',
        type: 'reminder',
        status: 'open',
      })
    })

    it('should propagate transaction tx to both findOpen and create', async () => {
      const mockTx = { isTx: true } as any
      const newConv = { id: 'conv-tx-new', status: 'open' }
      mockRepo.findOpenByInsuredAndEndpoint.mockResolvedValueOnce(null)
      mockRepo.create.mockResolvedValueOnce(newConv)

      const result = await service.getOrCreateActiveConversation(
        { organizationId: 'org-1', insuredId: 'ins-1', organizationChannelEndpointId: 'oce-1' } as any,
        mockTx,
      )

      expect(result).toEqual(newConv)
      expect(mockRepo.findOpenByInsuredAndEndpoint).toHaveBeenCalledWith('ins-1', 'oce-1', mockTx)
      expect(mockRepo.create).toHaveBeenCalledWith(expect.anything(), mockTx)
    })

    it('should propagate transaction tx when existing conversation is found', async () => {
      const mockTx = { isTx: true } as any
      const existingConv = { id: 'conv-tx-1', status: 'open' }
      mockRepo.findOpenByInsuredAndEndpoint.mockResolvedValueOnce(existingConv)

      const result = await service.getOrCreateActiveConversation(
        { organizationId: 'org-1', insuredId: 'ins-1', organizationChannelEndpointId: 'oce-1' } as any,
        mockTx,
      )

      expect(result).toEqual(existingConv)
      expect(mockRepo.findOpenByInsuredAndEndpoint).toHaveBeenCalledWith('ins-1', 'oce-1', mockTx)
    })
  })

  describe('linkEntityToConversation', () => {
    it('should delegate entity linking to repository for installment', async () => {
      mockRepo.linkEntity.mockResolvedValueOnce(undefined)

      await service.linkEntityToConversation('conv-1', { installmentId: 'inst-1' } as any)
      expect(mockRepo.linkEntity).toHaveBeenCalledWith('conv-1', { installmentId: 'inst-1' }, undefined)
    })

    it('should delegate entity linking to repository for policy', async () => {
      mockRepo.linkEntity.mockResolvedValueOnce(undefined)

      await service.linkEntityToConversation('conv-1', { policyId: 'pol-1' } as any)
      expect(mockRepo.linkEntity).toHaveBeenCalledWith('conv-1', { policyId: 'pol-1' }, undefined)
    })

    it('should propagate transaction tx in linkEntityToConversation', async () => {
      const mockTx = {} as any
      mockRepo.linkEntity.mockResolvedValueOnce(undefined)

      await service.linkEntityToConversation('conv-1', { installmentId: 'inst-1' } as any, mockTx)
      expect(mockRepo.linkEntity).toHaveBeenCalledWith('conv-1', { installmentId: 'inst-1' }, mockTx)
    })
  })
})
