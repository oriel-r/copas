import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPolicyCoveragesRepository } from './policy-coverages.repository'
import type { PolicyCoverageInsert } from '@copas/contracts'

describe('policy-coverages.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createPolicyCoveragesRepository>

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }
    repository = createPolicyCoveragesRepository({ db: mockDb })
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
    })
  })

  describe('findById', () => {
    it('should return coverage by id', async () => {
      const coverage = { id: 'cov-1', policyId: 'pol-1', data: { name: 'INCENDIO' } }
      mockDb.limit.mockResolvedValueOnce([coverage])

      const result = await repository.findById('cov-1')
      expect(result).toEqual(coverage)
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
    })
  })
})

