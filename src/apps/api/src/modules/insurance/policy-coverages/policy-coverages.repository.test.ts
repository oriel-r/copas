import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPolicyCoveragesRepository } from './policy-coverages.repository'
import type { PolicyCoverageInsert } from '@copas/contracts'

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

describe('policy-coverages.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createPolicyCoveragesRepository>

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
    repository = createPolicyCoveragesRepository({ db: mockDb })
  })

  describe('D1 vs Drizzle wrapping', () => {
    it('should wrap D1 database with drizzle lazily when db.prepare is a function', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createPolicyCoveragesRepository({ db: mockD1 as any })
      await repo.findById('cov-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap D1 database with drizzle lazily when passed positionally', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createPolicyCoveragesRepository(mockD1 as any)
      await repo.findById('cov-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap tx with drizzle if tx has prepare function', async () => {
      const mockTx = { prepare: vi.fn() }
      await repository.findById('cov-1', mockTx as any)
      expect(mockDrizzle).toHaveBeenCalledWith(mockTx)
    })
  })

  describe('findByPolicyId', () => {
    it('should return all coverages for given policyId', async () => {
      const coverages = [
        { id: 'cov-1', policyId: 'pol-1', data: { name: 'RESPONSABILIDAD CIVIL', limit: 20000000, franchise: null } },
        { id: 'cov-2', policyId: 'pol-1', data: { name: 'ROBO TOTAL', limit: 15000000, franchise: 100000 } },
      ]
      mockDb.where.mockResolvedValueOnce(coverages)

      const result = await repository.findByPolicyId('pol-1')
      expect(result).toEqual(coverages)
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should use transaction tx if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce([{ id: 'cov-1', policyId: 'pol-1' }]),
      }

      const result = await repository.findByPolicyId('pol-1', mockTx as any)
      expect(result).toEqual([{ id: 'cov-1', policyId: 'pol-1' }])
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('findById', () => {
    it('should return coverage by id', async () => {
      const coverage = { id: 'cov-1', policyId: 'pol-1', data: { name: 'INCENDIO' } }
      mockDb.limit.mockResolvedValueOnce([coverage])

      const result = await repository.findById('cov-1')
      expect(result).toEqual(coverage)
    })

    it('should return null if coverage not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findById('cov-missing')
      expect(result).toBeNull()
    })

    it('should use transaction tx in findById when provided', async () => {
      const coverage = { id: 'cov-1', policyId: 'pol-1', data: { name: 'INCENDIO' } }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([coverage]),
      }

      const result = await repository.findById('cov-1', mockTx as any)
      expect(result).toEqual(coverage)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('should insert single coverage and return it', async () => {
      const input: PolicyCoverageInsert = { policyId: 'pol-1', data: { name: 'TODO RIESGO', limit: 10000000 } }
      const created = { id: 'cov-3', ...input }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.create(input)
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should propagate transaction tx in create', async () => {
      const input: PolicyCoverageInsert = { policyId: 'pol-1', data: { name: 'TODO RIESGO', limit: 10000000 } }
      const created = { id: 'cov-3', ...input }
      const mockTx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([created]),
      }

      const result = await repository.create(input, mockTx as any)
      expect(result).toEqual(created)
      expect(mockTx.insert).toHaveBeenCalled()
      expect(mockDb.insert).not.toHaveBeenCalled()
    })
  })

  describe('createCoverage', () => {
    it('should insert single coverage via createCoverage and return it', async () => {
      const created = { id: 'cov-gr', policyId: 'pol-1', data: { name: 'GRANIZO' } }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.createCoverage('pol-1', { name: 'GRANIZO' })
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should default data to empty object if not provided in createCoverage', async () => {
      const created = { id: 'cov-empty', policyId: 'pol-1', data: {} }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.createCoverage('pol-1', undefined as any)
      expect(result).toEqual(created)
      expect(mockDb.values).toHaveBeenCalledWith({
        policyId: 'pol-1',
        data: {},
      })
    })

    it('should propagate transaction tx in createCoverage', async () => {
      const created = { id: 'cov-gr', policyId: 'pol-1', data: { name: 'GRANIZO' } }
      const mockTx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([created]),
      }

      const result = await repository.createCoverage('pol-1', { name: 'GRANIZO' }, mockTx as any)
      expect(result).toEqual(created)
      expect(mockTx.insert).toHaveBeenCalled()
      expect(mockDb.insert).not.toHaveBeenCalled()
    })
  })

  describe('createMany', () => {
    it('should insert batch of coverages and return them', async () => {
      const inputs: PolicyCoverageInsert[] = [
        { policyId: 'pol-1', data: { name: 'RC' } },
        { policyId: 'pol-1', data: { name: 'ROBO' } },
      ]
      const created = [
        { id: 'cov-1', policyId: 'pol-1', data: { name: 'RC' } },
        { id: 'cov-2', policyId: 'pol-1', data: { name: 'ROBO' } },
      ]
      mockDb.returning.mockResolvedValueOnce(created)

      const result = await repository.createMany(inputs)
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should propagate transaction tx', async () => {
      const inputs = [{ policyId: 'pol-1', data: { name: 'CRISTALES' } }]
      const created = [{ id: 'cov-4', policyId: 'pol-1', data: { name: 'CRISTALES' } }]
      const mockTx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce(created),
      }

      const result = await repository.createMany(inputs, mockTx as any)
      expect(result).toEqual(created)
      expect(mockTx.insert).toHaveBeenCalled()
      expect(mockDb.insert).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update coverage by id', async () => {
      const updated = { id: 'cov-1', data: { name: 'RC MODIFICADA' } }
      mockDb.returning.mockResolvedValueOnce([updated])

      const result = await repository.update('cov-1', { data: { name: 'RC MODIFICADA' } } as any)
      expect(result).toEqual(updated)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should propagate transaction tx in update', async () => {
      const updated = { id: 'cov-1', data: { name: 'RC MODIFICADA' } }
      const mockTx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([updated]),
      }

      const result = await repository.update('cov-1', { data: { name: 'RC MODIFICADA' } } as any, mockTx as any)
      expect(result).toEqual(updated)
      expect(mockTx.update).toHaveBeenCalled()
      expect(mockDb.update).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete coverage by id', async () => {
      mockDb.where.mockResolvedValueOnce({ rowCount: 1 })

      await repository.delete('cov-1')
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should propagate transaction tx in delete', async () => {
      const mockTx = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce({ rowCount: 1 }),
      }

      await repository.delete('cov-1', mockTx as any)
      expect(mockTx.delete).toHaveBeenCalled()
      expect(mockDb.delete).not.toHaveBeenCalled()
    })
  })

  describe('deleteByPolicyId', () => {
    it('should delete all coverages for a policy', async () => {
      mockDb.where.mockResolvedValueOnce({ rowCount: 2 })

      await repository.deleteByPolicyId('pol-1')
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should propagate transaction tx in deleteByPolicyId', async () => {
      const mockTx = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce({ rowCount: 2 }),
      }

      await repository.deleteByPolicyId('pol-1', mockTx as any)
      expect(mockTx.delete).toHaveBeenCalled()
      expect(mockDb.delete).not.toHaveBeenCalled()
    })
  })
})


