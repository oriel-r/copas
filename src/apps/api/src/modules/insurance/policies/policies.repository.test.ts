import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPoliciesRepository } from './policies.repository'
import type { PolicyInsert } from '@copas/contracts'

describe('policies.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createPoliciesRepository>

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }
    repository = createPoliciesRepository({ db: mockDb })
  })

  describe('findById', () => {
    it('should return policy by id', async () => {
      const policy = {
        id: 'pol-1',
        organizationId: 'org-1',
        companyId: 'comp-1',
        insuredId: 'ins-1',
        paymentMethodId: 'pm-1',
        uploadedBy: 'usr-1',
        producedBy: null,
        policyNumber: 'POL-12345',
        premiumTotal: 150000,
        currency: 'ARS',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        effectiveEndDate: null,
        status: 'active',
        billingFrequency: 'monthly',
        documentUrl: 'https://r2.example.com/pol.pdf',
      }
      mockDb.limit.mockResolvedValueOnce([policy])

      const result = await repository.findById('pol-1')
      expect(result).toEqual(policy)
    })

    it('should use transaction tx in findById if provided', async () => {
      const policy = { id: 'pol-1', policyNumber: 'POL-TX' }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([policy]),
      }

      const result = await repository.findById('pol-1', mockTx as any)
      expect(result).toEqual(policy)
      expect(mockTx.select).toHaveBeenCalled()
    })
  })

  describe('findByNumber', () => {
    it('should return policy by organizationId, companyId and policyNumber', async () => {
      const policy = { id: 'pol-1', organizationId: 'org-1', companyId: 'comp-1', policyNumber: 'POL-12345' }
      mockDb.limit.mockResolvedValueOnce([policy])

      const result = await repository.findByNumber('org-1', 'comp-1', 'POL-12345')
      expect(result).toEqual(policy)
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should return null if not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findByNumber('org-1', 'comp-1', 'NON-EXISTENT')
      expect(result).toBeNull()
    })

    it('should use transaction tx in findByNumber if provided', async () => {
      const policy = { id: 'pol-1', policyNumber: 'POL-TX' }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([policy]),
      }

      const result = await repository.findByNumber('org-1', 'comp-1', 'POL-TX', mockTx as any)
      expect(result).toEqual(policy)
      expect(mockTx.select).toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('should insert and return new policy', async () => {
      const input: PolicyInsert = {
        organizationId: 'org-1',
        companyId: 'comp-1',
        insuredId: 'ins-1',
        paymentMethodId: 'pm-1',
        uploadedBy: 'usr-1',
        policyNumber: 'POL-999',
        premiumTotal: 200000,
        currency: 'ARS',
        startDate: '2026-03-01',
        endDate: '2027-03-01',
        status: 'active',
        billingFrequency: 'monthly',
      }
      const created = { id: 'pol-2', ...input }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.create(input)
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should propagate transaction tx', async () => {
      const input: PolicyInsert = {
        organizationId: 'org-1',
        companyId: 'comp-1',
        insuredId: 'ins-1',
        uploadedBy: 'usr-1',
        policyNumber: 'POL-TX',
      }
      const created = { id: 'pol-3', ...input }
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
    it('should update policy status and fields', async () => {
      const updated = { id: 'pol-1', status: 'renewed' }
      mockDb.returning.mockResolvedValueOnce([updated])

      const result = await repository.update('pol-1', { status: 'renewed' })
      expect(result).toEqual(updated)
    })

    it('should use transaction tx in update if provided', async () => {
      const updated = { id: 'pol-1', status: 'renewed' }
      const mockTx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([updated]),
      }

      const result = await repository.update('pol-1', { status: 'renewed' }, mockTx as any)
      expect(result).toEqual(updated)
      expect(mockTx.update).toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete policy by id', async () => {
      mockDb.where.mockResolvedValueOnce({ rowCount: 1 })

      await repository.delete('pol-1')
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should use transaction tx in delete if provided', async () => {
      const mockTx = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce({ rowCount: 1 }),
      }

      await repository.delete('pol-1', mockTx as any)
      expect(mockTx.delete).toHaveBeenCalled()
    })
  })

  describe('list', () => {
    it('should return list of policies for organization', async () => {
      const list = [{ id: 'pol-1', policyNumber: 'POL-1' }]
      mockDb.offset.mockResolvedValueOnce(list)

      const result = await repository.list({ organizationId: 'org-1' })
      expect(result).toEqual(list)
    })
  })
})

