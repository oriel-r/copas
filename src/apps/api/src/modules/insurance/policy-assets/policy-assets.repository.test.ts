import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPolicyAssetsRepository } from './policy-assets.repository'
import type { PolicyAssetInsert } from '@copas/contracts'

describe('policy-assets.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createPolicyAssetsRepository>

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }
    repository = createPolicyAssetsRepository({ db: mockDb })
  })

  describe('findByPolicyId', () => {
    it('should return policy asset junctions for given policyId', async () => {
      const junctions = [{ policyId: 'pol-1', assetId: 'ast-1' }]
      mockDb.where.mockResolvedValueOnce(junctions)

      const result = await repository.findByPolicyId('pol-1')
      expect(result).toEqual(junctions)
    })

    it('should use transaction tx if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce([{ policyId: 'pol-1', assetId: 'ast-1' }]),
      }

      const result = await repository.findByPolicyId('pol-1', mockTx as any)
      expect(result).toEqual([{ policyId: 'pol-1', assetId: 'ast-1' }])
      expect(mockTx.select).toHaveBeenCalled()
    })
  })

  describe('findByAssetId', () => {
    it('should return policy asset junctions for given assetId', async () => {
      const junctions = [{ policyId: 'pol-1', assetId: 'ast-1' }]
      mockDb.where.mockResolvedValueOnce(junctions)

      const result = await repository.findByAssetId('ast-1')
      expect(result).toEqual(junctions)
    })
  })

  describe('create', () => {
    it('should insert and return policy asset junction', async () => {
      const input: PolicyAssetInsert = { policyId: 'pol-1', assetId: 'ast-1' }
      mockDb.returning.mockResolvedValueOnce([input])

      const result = await repository.create(input)
      expect(result).toEqual(input)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should propagate transaction tx', async () => {
      const input = { policyId: 'pol-1', assetId: 'ast-2' }
      const mockTx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([input]),
      }

      const result = await repository.create(input, mockTx as any)
      expect(result).toEqual(input)
      expect(mockTx.insert).toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete junction record', async () => {
      mockDb.where.mockResolvedValueOnce({ rowCount: 1 })

      await repository.delete('pol-1', 'ast-1')
      expect(mockDb.delete).toHaveBeenCalled()
    })
  })
})
