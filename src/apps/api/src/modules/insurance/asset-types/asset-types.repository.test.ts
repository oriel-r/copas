import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAssetTypesRepository } from './asset-types.repository'
import type { AssetTypeInsert } from '@copas/contracts'

describe('asset-types.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createAssetTypesRepository>

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
    }
    repository = createAssetTypesRepository({ db: mockDb })
  })

  describe('findById', () => {
    it('should return asset type by id', async () => {
      const assetType = { id: 'at-1', code: 'AUTO', name: 'Auto', branchId: 'b-1', propertyDefinition: {} }
      mockDb.limit.mockResolvedValueOnce([assetType])

      const result = await repository.findById('at-1')
      expect(result).toEqual(assetType)
    })

    it('should return null if not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findById('at-999')
      expect(result).toBeNull()
    })

    it('should use transaction tx in findById if provided', async () => {
      const assetType = { id: 'at-1', code: 'AUTO' }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([assetType]),
      }

      const result = await repository.findById('at-1', mockTx as any)
      expect(result).toEqual(assetType)
      expect(mockTx.select).toHaveBeenCalled()
    })
  })

  describe('findByCode', () => {
    it('should return asset type by code', async () => {
      const assetType = { id: 'at-1', code: 'AUTO', name: 'Auto', branchId: null, propertyDefinition: {} }
      mockDb.limit.mockResolvedValueOnce([assetType])

      const result = await repository.findByCode('AUTO')
      expect(result).toEqual(assetType)
    })

    it('should filter by branchId when provided', async () => {
      const assetType = { id: 'at-2', code: 'AUTO', name: 'Auto', branchId: 'b-1', propertyDefinition: {} }
      mockDb.limit.mockResolvedValueOnce([assetType])

      const result = await repository.findByCode('AUTO', 'b-1')
      expect(result).toEqual(assetType)
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should use transaction tx in findByCode if provided', async () => {
      const assetType = { id: 'at-3', code: 'BOAT', name: 'Barco' }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([assetType]),
      }

      const result = await repository.findByCode('BOAT', undefined, mockTx as any)
      expect(result).toEqual(assetType)
      expect(mockTx.select).toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('should insert and return new asset type', async () => {
      const input: AssetTypeInsert = { code: 'MOTO', name: 'Moto', branchId: null, propertyDefinition: { patente: 'string' } }
      const created = { id: 'at-3', ...input }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.create(input)
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should use transaction tx if provided', async () => {
      const input: AssetTypeInsert = { code: 'HOME', name: 'Home', branchId: null, propertyDefinition: {} }
      const created = { id: 'at-4', ...input }
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

  describe('list', () => {
    it('should return list of asset types with branch filter and pagination', async () => {
      const list = [{ id: 'at-1', code: 'AUTO', name: 'Auto' }]
      mockDb.offset.mockResolvedValueOnce(list)

      const result = await repository.list({ branchId: 'b-1', limit: 10, offset: 0 })
      expect(result).toEqual(list)
    })
  })
})

