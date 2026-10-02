import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPoliciesRepository } from './policies.repository'
import type { PolicyInsert } from '@copas/contracts'

const { mockDrizzle } = vi.hoisted(() => ({
  mockDrizzle: vi.fn((d1: any) => ({
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
    _drizzleWrapped: true,
    _rawD1: d1,
  })),
}))

vi.mock('drizzle-orm/d1', () => ({
  drizzle: mockDrizzle,
}))

describe('policies.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createPoliciesRepository>

  beforeEach(() => {
    mockDrizzle.mockClear()
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

  describe('D1 vs Drizzle wrapping', () => {
    it('should wrap D1 database with drizzle lazily when db.prepare is a function', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createPoliciesRepository({ db: mockD1 as any })
      await repo.findById('pol-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap D1 database with drizzle lazily when passed positionally', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createPoliciesRepository(mockD1 as any)
      await repo.findById('pol-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap tx with drizzle if tx has prepare function', async () => {
      const mockTx = { prepare: vi.fn() }
      await repository.findById('pol-1', mockTx as any)
      expect(mockDrizzle).toHaveBeenCalledWith(mockTx)
    })
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

    it('should return null if policy not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findById('pol-missing')
      expect(result).toBeNull()
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

  describe('createPolicy', () => {
    it('should insert and return new policy via createPolicy', async () => {
      const input: any = {
        organizationId: 'org-1',
        companyId: 'comp-1',
        insuredId: 'ins-1',
        policyNumber: 'POL-CP-1',
      }
      const created = { id: 'pol-cp', ...input }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.createPolicy(input)
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should propagate transaction tx in createPolicy', async () => {
      const input: any = {
        organizationId: 'org-1',
        companyId: 'comp-1',
        insuredId: 'ins-1',
        policyNumber: 'POL-CP-TX',
      }
      const created = { id: 'pol-cp-tx', ...input }
      const mockTx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([created]),
      }

      const result = await repository.createPolicy(input, mockTx as any)
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

    it('should use default limit 50 and offset 0', async () => {
      mockDb.offset.mockResolvedValueOnce([])

      await repository.list({ organizationId: 'org-1' })
      expect(mockDb.limit).toHaveBeenCalledWith(50)
      expect(mockDb.offset).toHaveBeenCalledWith(0)
    })

    it('should use custom limit and offset if provided', async () => {
      mockDb.offset.mockResolvedValueOnce([])

      await repository.list({ organizationId: 'org-1', limit: 10, offset: 25 })
      expect(mockDb.limit).toHaveBeenCalledWith(10)
      expect(mockDb.offset).toHaveBeenCalledWith(25)
    })

    it('should filter by companyId', async () => {
      mockDb.offset.mockResolvedValueOnce([])

      await repository.list({ organizationId: 'org-1', companyId: 'comp-1' })
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should filter by insuredId', async () => {
      mockDb.offset.mockResolvedValueOnce([])

      await repository.list({ organizationId: 'org-1', insuredId: 'ins-1' })
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should filter by status', async () => {
      mockDb.offset.mockResolvedValueOnce([])

      await repository.list({ organizationId: 'org-1', status: 'active' as any })
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should use transaction tx in list if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValueOnce([]),
      }

      await repository.list({ organizationId: 'org-1' }, mockTx as any)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('extraction results', () => {
    it('should insert extraction result via createExtractionResult', async () => {
      const data: any = { policyId: 'pol-1', rawText: 'extracted', metadata: {} }
      const created = { id: 'ext-1', ...data }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.createExtractionResult(data)
      expect(result).toBe('ext-1')
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should propagate tx in createExtractionResult', async () => {
      const data: any = { policyId: 'pol-1', rawText: 'extracted', metadata: {} }
      const created = { id: 'ext-1', ...data }
      const mockTx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([created]),
      }

      const result = await repository.createExtractionResult(data, mockTx as any)
      expect(result).toBe('ext-1')
      expect(mockTx.insert).toHaveBeenCalled()
    })

    it('should update extraction result via updateExtractionResult', async () => {
      const updated = { id: 'ext-1', status: 'processed' }
      mockDb.returning.mockResolvedValueOnce([updated])

      const result = await repository.updateExtractionResult('ext-1', { status: 'processed' } as any)
      expect(result).toEqual(updated)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should propagate tx in updateExtractionResult', async () => {
      const updated = { id: 'ext-1', status: 'processed' }
      const mockTx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([updated]),
      }

      const result = await repository.updateExtractionResult('ext-1', { status: 'processed' } as any, mockTx as any)
      expect(result).toEqual(updated)
      expect(mockTx.update).toHaveBeenCalled()
    })

    it('should get extraction result by id', async () => {
      const ext = { id: 'ext-1', policyId: 'pol-1' }
      mockDb.limit.mockResolvedValueOnce([ext])

      const result = await repository.getExtractionResult('ext-1')
      expect(result).toEqual(ext)
    })

    it('should return null when extraction result not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.getExtractionResult('ext-missing')
      expect(result).toBeNull()
    })

    it('should propagate tx in getExtractionResult', async () => {
      const ext = { id: 'ext-1', policyId: 'pol-1' }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([ext]),
      }

      const result = await repository.getExtractionResult('ext-1', mockTx as any)
      expect(result).toEqual(ext)
      expect(mockTx.select).toHaveBeenCalled()
    })
  })
})

