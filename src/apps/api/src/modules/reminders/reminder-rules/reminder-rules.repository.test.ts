import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createReminderRulesRepository } from './reminder-rules.repository'
import type { ReminderRule, ReminderRuleInsert, ReminderRuleUpdate } from '@copas/contracts'

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

describe('reminder-rules.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createReminderRulesRepository>

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
    repository = createReminderRulesRepository({ db: mockDb })
  })

  describe('D1 vs Drizzle wrapping', () => {
    it('should wrap D1 database with drizzle lazily when db.prepare is a function', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createReminderRulesRepository({ db: mockD1 as any })
      await repo.findById('rule-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap D1 database with drizzle lazily when passed positionally', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createReminderRulesRepository(mockD1 as any)
      await repo.findById('rule-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap tx with drizzle if tx has prepare function', async () => {
      const mockTx = { prepare: vi.fn() }
      await repository.findById('rule-1', mockTx as any)
      expect(mockDrizzle).toHaveBeenCalledWith(mockTx)
    })
  })

  describe('findAll', () => {
    it('should return all reminder rules for organization', async () => {
      const rules: ReminderRule[] = [
        {
          id: '018f9e2b-1111-7000-8000-000000000001',
          organizationId: 'org-1',
          eventSource: 'installment_due',
          offsetDays: -3,
          templateId: 'tmpl-1',
          isEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: '018f9e2b-1111-7000-8000-000000000002',
          organizationId: 'org-1',
          eventSource: 'installment_due',
          offsetDays: 0,
          templateId: 'tmpl-2',
          isEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ]
      mockDb.where.mockResolvedValueOnce(rules)

      const result = await repository.findAll('org-1')
      expect(result).toEqual(rules)
      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.from).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should propagate transaction tx in findAll if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce([]),
      }

      const result = await repository.findAll('org-1', mockTx as any)
      expect(result).toEqual([])
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('findActive', () => {
    it('should return active reminder rules for an organization', async () => {
      const activeRules = [
        {
          id: '018f9e2b-1111-7000-8000-000000000001',
          organizationId: 'org-1',
          eventSource: 'installment_due',
          offsetDays: -3,
          isEnabled: true,
          deletedAt: null,
        },
      ]
      mockDb.where.mockResolvedValueOnce(activeRules)

      const result = await repository.findActive('org-1')
      expect(result).toEqual(activeRules)
      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should propagate transaction tx in findActive', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce([]),
      }

      const result = await repository.findActive('org-1', mockTx as any)
      expect(result).toEqual([])
      expect(mockTx.select).toHaveBeenCalled()
    })
  })

  describe('findById', () => {
    it('should return reminder rule by id when found', async () => {
      const rule: ReminderRule = {
        id: '018f9e2b-1111-7000-8000-000000000001',
        organizationId: 'org-1',
        eventSource: 'installment_due',
        offsetDays: -3,
        templateId: 'tmpl-1',
        isEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockDb.limit.mockResolvedValueOnce([rule])

      const result = await repository.findById(rule.id)
      expect(result).toEqual(rule)
      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should return null when reminder rule is not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findById('non-existent-id')
      expect(result).toBeNull()
    })

    it('should propagate transaction tx in findById if provided', async () => {
      const rule = { id: 'rule-tx' }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([rule]),
      }

      const result = await repository.findById('rule-tx', mockTx as any)
      expect(result).toEqual(rule)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('should insert and return a new reminder rule', async () => {
      const input: ReminderRuleInsert = {
        organizationId: '018f9e2b-2222-7000-8000-000000000002',
        eventSource: 'installment_due',
        offsetDays: -3,
        templateId: '018f9e2b-3333-7000-8000-000000000003',
        isEnabled: true,
      }
      const created: ReminderRule = {
        id: '018f9e2b-1111-7000-8000-000000000001',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.create(input)
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining(input))
    })

    it('should use transaction tx in create if provided', async () => {
      const input: ReminderRuleInsert = {
        organizationId: 'org-1',
        eventSource: 'policy_expiration',
        offsetDays: 0,
        isEnabled: true,
      }
      const created = { id: 'rule-new', ...input }
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

  describe('update', () => {
    it('should update reminder rule fields', async () => {
      const updateData: ReminderRuleUpdate = {
        offsetDays: -5,
        isEnabled: false,
      }
      const updated = { id: 'rule-1', ...updateData }
      mockDb.returning.mockResolvedValueOnce([updated])

      const result = await repository.update('rule-1', updateData)
      expect(result).toEqual(updated)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should use transaction tx in update if provided', async () => {
      const updateData = { isEnabled: true }
      const updated = { id: 'rule-1', ...updateData }
      const mockTx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([updated]),
      }

      const result = await repository.update('rule-1', updateData, mockTx as any)
      expect(result).toEqual(updated)
      expect(mockTx.update).toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete or soft-delete a reminder rule', async () => {
      mockDb.returning.mockResolvedValueOnce([{ id: 'rule-1' }])

      const result = await repository.delete('rule-1')
      expect(result).toBeTruthy()
    })

    it('should use transaction tx in delete if provided', async () => {
      const mockTx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([{ id: 'rule-1' }]),
        delete: vi.fn().mockReturnThis(),
      }

      const result = await repository.delete('rule-1', mockTx as any)
      expect(result).toBeTruthy()
    })
  })
})
