import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMessagesRepository } from './messages.repository'
import type { Message, MessageInsert, MessageStatusInsert, MessageStatus } from '@copas/contracts'

const { mockDrizzle } = vi.hoisted(() => ({
  mockDrizzle: vi.fn((d1: any) => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    _drizzleWrapped: true,
    _rawD1: d1,
  })),
}))

vi.mock('drizzle-orm/d1', () => ({
  drizzle: mockDrizzle,
}))

describe('messages.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createMessagesRepository>

  beforeEach(() => {
    mockDrizzle.mockClear()
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    }
    repository = createMessagesRepository({ db: mockDb })
  })

  describe('D1 vs Drizzle wrapping', () => {
    it('should wrap D1 database with drizzle lazily when db.prepare is a function', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createMessagesRepository({ db: mockD1 as any })
      await repo.findByDeduplicationHash('org-1', 'hash-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap D1 database with drizzle lazily when passed positionally', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createMessagesRepository(mockD1 as any)
      await repo.findByDeduplicationHash('org-1', 'hash-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap tx with drizzle if tx has prepare function', async () => {
      const mockTx = { prepare: vi.fn() }
      await repository.findByDeduplicationHash('org-1', 'hash-1', mockTx as any)
      expect(mockDrizzle).toHaveBeenCalledWith(mockTx)
    })
  })

  describe('findByDeduplicationHash', () => {
    it('should return message when deduplicationHash exists in organization', async () => {
      const msg: Message = {
        id: 'msg-1',
        organizationId: 'org-1',
        conversationId: 'conv-1',
        channelEndpointId: 'cep-1',
        direction: 'outbound',
        status: 'sent',
        content: 'Recordatorio de cuota',
        rawPayload: null,
        metadata: {},
        deduplicationHash: 'hash-abc-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockDb.limit.mockResolvedValueOnce([msg])

      const result = await repository.findByDeduplicationHash('org-1', 'hash-abc-123')
      expect(result).toEqual(msg)
      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should return null when deduplicationHash is not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findByDeduplicationHash('org-1', 'non-existent-hash')
      expect(result).toBeNull()
    })

    it('should propagate transaction tx in findByDeduplicationHash', async () => {
      const msg = { id: 'msg-tx', deduplicationHash: 'hash-tx' }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([msg]),
      }

      const result = await repository.findByDeduplicationHash('org-1', 'hash-tx', mockTx as any)
      expect(result).toEqual(msg)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('should insert message with deduplicationHash and return created message', async () => {
      const input: MessageInsert = {
        organizationId: 'org-1',
        conversationId: 'conv-1',
        channelEndpointId: 'cep-1',
        direction: 'outbound',
        status: 'sent',
        content: 'Su cuota vence en 3 días',
        deduplicationHash: 'hash-unique-sha256',
        metadata: { reminderRuleId: 'rule-1' },
      }
      const created: Message = {
        id: 'msg-new-1',
        ...input,
        rawPayload: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.create(input)
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        deduplicationHash: 'hash-unique-sha256',
        status: 'sent',
      }))
    })

    it('should use transaction tx in create if provided', async () => {
      const input: MessageInsert = {
        organizationId: 'org-1',
        conversationId: 'conv-1',
        channelEndpointId: 'cep-1',
        direction: 'outbound',
        status: 'skipped',
        content: null,
        deduplicationHash: 'hash-skipped-sha256',
      }
      const created = { id: 'msg-tx', ...input }
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

  describe('createStatus', () => {
    it('should insert a message status record (e.g. sent, skipped)', async () => {
      const statusInput: MessageStatusInsert = {
        messageId: 'msg-1',
        status: 'sent',
        reason: null,
        rawPayload: null,
      }
      const createdStatus: MessageStatus = {
        id: 'ms-1',
        ...statusInput,
        createdAt: new Date(),
      }
      mockDb.returning.mockResolvedValueOnce([createdStatus])

      const result = await repository.createStatus(statusInput)
      expect(result).toEqual(createdStatus)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should use transaction tx in createStatus if provided', async () => {
      const statusInput: MessageStatusInsert = {
        messageId: 'msg-1',
        status: 'skipped',
        reason: 'opt_out',
        rawPayload: null,
      }
      const createdStatus = { id: 'ms-tx', ...statusInput }
      const mockTx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([createdStatus]),
      }

      const result = await repository.createStatus(statusInput, mockTx as any)
      expect(result).toEqual(createdStatus)
      expect(mockTx.insert).toHaveBeenCalled()
    })
  })
})
