import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAssetTypesService } from './asset-types.service'
import type { AssetType, AssetTypeInsert } from '@copas/contracts'

describe('asset-types.service', () => {
  let mockRepo: any
  let service: ReturnType<typeof createAssetTypesService>

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByCode: vi.fn(),
      create: vi.fn(),
      list: vi.fn(),
    }
    service = createAssetTypesService({ assetTypesRepository: mockRepo })
  })

  describe('getById', () => {
    it('should return asset type when found', async () => {
      const assetType: AssetType = {
        id: 'at-1',
        branchId: null,
        code: 'AUTO',
        name: 'Auto',
        propertyDefinition: { brand: 'string' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockRepo.findById.mockResolvedValueOnce(assetType)

      const result = await service.getById('at-1')
      expect(result).toEqual(assetType)
    })
  })

  describe('findByCode', () => {
    it('should return asset type by code and branchId', async () => {
      const assetType = { id: 'at-1', code: 'MOTO', name: 'Moto' }
      mockRepo.findByCode.mockResolvedValueOnce(assetType)

      const result = await service.findByCode('MOTO', 'b-1')
      expect(result).toEqual(assetType)
      expect(mockRepo.findByCode).toHaveBeenCalledWith('MOTO', 'b-1', undefined)
    })
  })

  describe('findOrCreate', () => {
    it('should return existing asset type if found', async () => {
      const existing = { id: 'at-1', code: 'AUTO', name: 'Auto' }
      mockRepo.findByCode.mockResolvedValueOnce(existing)

      const result = await service.findOrCreate({ code: 'AUTO', name: 'Auto' })
      expect(result).toEqual(existing)
      expect(mockRepo.create).not.toHaveBeenCalled()
    })

    it('should create new asset type if not found', async () => {
      const input: AssetTypeInsert = { code: 'PERSON', name: 'Person', branchId: null, propertyDefinition: {} }
      const created = { id: 'at-2', ...input }
      mockRepo.findByCode.mockResolvedValueOnce(null)
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.findOrCreate(input)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input, undefined)
    })

    it('should propagate transaction tx', async () => {
      const mockTx = {} as any
      const input = { code: 'LIFE', name: 'Life' }
      mockRepo.findByCode.mockResolvedValueOnce(null)
      mockRepo.create.mockResolvedValueOnce({ id: 'at-3', ...input })

      await service.findOrCreate(input, mockTx)
      expect(mockRepo.findByCode).toHaveBeenCalledWith('LIFE', undefined, mockTx)
      expect(mockRepo.create).toHaveBeenCalledWith(input, mockTx)
    })
  })

  describe('list', () => {
    it('should return list of asset types', async () => {
      const list = [{ id: 'at-1', code: 'AUTO', name: 'Auto' }]
      mockRepo.list.mockResolvedValueOnce(list)

      const result = await service.list()
      expect(result).toEqual(list)
    })
  })
})
