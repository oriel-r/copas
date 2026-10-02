import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPolicyAssetsRepository } from './policy-assets.repository'
import type { PolicyAssetInsert } from '@copas/contracts'

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

describe('policy-assets.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createPolicyAssetsRepository>

  beforeEach(() => {
    mockDrizzle.mockClear()
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

  describe('D1 vs Drizzle wrapping', () => {
    it('should wrap D1 database with drizzle lazily when db.prepare is a function', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createPolicyAssetsRepository({ db: mockD1 as any })
      await repo.findByPolicyId('pol-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap D1 database with drizzle lazily when passed positionally', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createPolicyAssetsRepository(mockD1 as any)
      await repo.findByPolicyId('pol-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap tx with drizzle if tx has prepare function', async () => {
      const mockTx = { prepare: vi.fn() }
      await repository.findByPolicyId('pol-1', mockTx as any)
      expect(mockDrizzle).toHaveBeenCalledWith(mockTx)
    })
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
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('findByAssetId', () => {
    it('should return policy asset junctions for given assetId', async () => {
      const junctions = [{ policyId: 'pol-1', assetId: 'ast-1' }]
      mockDb.where.mockResolvedValueOnce(junctions)

      const result = await repository.findByAssetId('ast-1')
      expect(result).toEqual(junctions)
    })

    it('should use transaction tx in findByAssetId when provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce([{ policyId: 'pol-1', assetId: 'ast-1' }]),
      }

      const result = await repository.findByAssetId('ast-1', mockTx as any)
      expect(result).toEqual([{ policyId: 'pol-1', assetId: 'ast-1' }])
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
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
      expect(mockDb.insert).not.toHaveBeenCalled()
    })
  })

  describe('linkAsset', () => {
    it('should link asset to policy and return junction', async () => {
      const expected = { policyId: 'pol-1', assetId: 'ast-1' }
      mockDb.returning.mockResolvedValueOnce([expected])

      const result = await repository.linkAsset('pol-1', 'ast-1')
      expect(result).toEqual(expected)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should propagate transaction tx in linkAsset', async () => {
      const expected = { policyId: 'pol-1', assetId: 'ast-1' }
      const mockTx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([expected]),
      }

      const result = await repository.linkAsset('pol-1', 'ast-1', mockTx as any)
      expect(result).toEqual(expected)
      expect(mockTx.insert).toHaveBeenCalled()
      expect(mockDb.insert).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete junction record', async () => {
      mockDb.where.mockResolvedValueOnce({ rowCount: 1 })

      await repository.delete('pol-1', 'ast-1')
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should propagate transaction tx in delete', async () => {
      const mockTx = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce({ rowCount: 1 }),
      }

      await repository.delete('pol-1', 'ast-1', mockTx as any)
      expect(mockTx.delete).toHaveBeenCalled()
      expect(mockDb.delete).not.toHaveBeenCalled()
    })
  })
})


