import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createConversationsRepository } from './conversations.repository'
import type { Conversation, ConversationInsert } from '@copas/contracts'

const { mockDrizzle } = vi.hoisted(() => ({
  mockDrizzle: vi.fn((d1: any) => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    _drizzleWrapped: true,
    _rawD1: d1,
  })),
}))

vi.mock('drizzle-orm/d1', () => ({
  drizzle: mockDrizzle,
}))

describe('conversations.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createConversationsRepository>

  beforeEach(() => {
    mockDrizzle.mockClear()
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }
    repository = createConversationsRepository({ db: mockDb })
  })

  describe('D1 vs Drizzle wrapping', () => {
    it('should wrap D1 database with drizzle lazily when db.prepare is a function', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createConversationsRepository({ db: mockD1 as any })
      await repo.findOpenByInsuredAndEndpoint({ organizationId: 'org-1', insuredId: 'ins-1', channelEndpointId: 'cep-1' })
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap D1 database with drizzle lazily when passed positionally', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createConversationsRepository(mockD1 as any)
      await repo.findOpenByInsuredAndEndpoint({ organizationId: 'org-1', insuredId: 'ins-1', channelEndpointId: 'cep-1' })
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap tx with drizzle if tx has prepare function', async () => {
      const mockTx = { prepare: vi.fn() }
      await repository.findOpenByInsuredAndEndpoint(
        { organizationId: 'org-1', insuredId: 'ins-1', channelEndpointId: 'cep-1' },
        mockTx as any,
      )
      expect(mockDrizzle).toHaveBeenCalledWith(mockTx)
    })
  })

  describe('findOpenByInsuredAndEndpoint', () => {
    it('should return open conversation when found', async () => {
      const conv: Conversation = {
        id: 'conv-1',
        organizationId: 'org-1',
        channelEndpointId: 'cep-1',
        status: 'open',
        lastMessageAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockDb.limit.mockResolvedValueOnce([conv])

      const result = await repository.findOpenByInsuredAndEndpoint({
        organizationId: 'org-1',
        insuredId: 'ins-1',
        channelEndpointId: 'cep-1',
      })
      expect(result).toEqual(conv)
      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should return null when no open conversation exists', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findOpenByInsuredAndEndpoint({
        organizationId: 'org-1',
        insuredId: 'ins-1',
        channelEndpointId: 'cep-1',
      })
      expect(result).toBeNull()
    })

    it('should propagate transaction tx if provided', async () => {
      const conv = { id: 'conv-tx', status: 'open' }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([conv]),
      }

      const result = await repository.findOpenByInsuredAndEndpoint(
        { organizationId: 'org-1', insuredId: 'ins-1', channelEndpointId: 'cep-1' },
        mockTx as any,
      )
      expect(result).toEqual(conv)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('should insert and return a new conversation', async () => {
      const input: ConversationInsert = {
        organizationId: 'org-1',
        channelEndpointId: 'cep-1',
        status: 'open',
      }
      const created: Conversation = {
        id: 'conv-created-1',
        ...input,
        lastMessageAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.create(input)
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should use transaction tx in create if provided', async () => {
      const input: ConversationInsert = {
        organizationId: 'org-1',
        channelEndpointId: 'cep-1',
        status: 'open',
      }
      const created = { id: 'conv-tx-1', ...input }
      const mockTx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([created]),
      }

      const result = await repository.create(input, mockTx as any)
      expect(result).toEqual(created)
      expect(mockTx.insert).toHaveBeenCalled()
    })
  })

  describe('linkEntity', () => {
    it('should insert conversation entity link for installment', async () => {
      mockDb.returning.mockResolvedValueOnce([{ id: 'link-1' }])

      await repository.linkEntity('conv-1', { installmentId: 'inst-1' })
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should insert conversation entity link for policy', async () => {
      mockDb.returning.mockResolvedValueOnce([{ id: 'link-2' }])

      await repository.linkEntity('conv-1', { policyId: 'pol-1' })
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should use transaction tx in linkEntity if provided', async () => {
      const mockTx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([{ id: 'link-tx' }]),
      }

      await repository.linkEntity('conv-1', { installmentId: 'inst-1' }, mockTx as any)
      expect(mockTx.insert).toHaveBeenCalled()
      expect(mockDb.insert).not.toHaveBeenCalled()
    })
  })
})
