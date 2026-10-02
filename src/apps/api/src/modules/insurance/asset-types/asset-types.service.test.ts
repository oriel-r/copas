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

  describe('initialization / DI', () => {
    it('should support options object dependency injection', async () => {
      const svc = createAssetTypesService({ assetTypesRepository: mockRepo })
      mockRepo.findById.mockResolvedValueOnce({ id: 'at-1' })
      const res = await svc.getById('at-1')
      expect(res).toEqual({ id: 'at-1' })
    })

    it('should support positional repository dependency injection', async () => {
      const svc = createAssetTypesService(mockRepo as any)
      mockRepo.findById.mockResolvedValueOnce({ id: 'at-1' })
      const res = await svc.getById('at-1')
      expect(res).toEqual({ id: 'at-1' })
    })

    it('should handle undefined repository in factory without throwing', () => {
      const svc = createAssetTypesService(undefined as any)
      expect(svc).toBeDefined()
    })
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
      expect(mockRepo.findById).toHaveBeenCalledWith('at-1', undefined)
    })

    it('should return null when asset type not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null)
      const result = await service.getById('non-existent')
      expect(result).toBeNull()
      expect(mockRepo.findById).toHaveBeenCalledWith('non-existent', undefined)
    })

    it('should propagate tx in getById', async () => {
      const mockTx = {} as any
      mockRepo.findById.mockResolvedValueOnce({ id: 'at-1' })
      const result = await service.getById('at-1', mockTx)
      expect(result).toEqual({ id: 'at-1' })
      expect(mockRepo.findById).toHaveBeenCalledWith('at-1', mockTx)
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

    it('should query without branchId when omitted', async () => {
      const assetType = { id: 'at-1', code: 'AUTO', name: 'Auto' }
      mockRepo.findByCode.mockResolvedValueOnce(assetType)

      const result = await service.findByCode('AUTO')
      expect(result).toEqual(assetType)
      expect(mockRepo.findByCode).toHaveBeenCalledWith('AUTO', undefined, undefined)
    })

    it('should return null when code is not found', async () => {
      mockRepo.findByCode.mockResolvedValueOnce(null)
      const result = await service.findByCode('UNKNOWN')
      expect(result).toBeNull()
      expect(mockRepo.findByCode).toHaveBeenCalledWith('UNKNOWN', undefined, undefined)
    })

    it('should propagate tx in findByCode', async () => {
      const mockTx = {} as any
      mockRepo.findByCode.mockResolvedValueOnce({ id: 'at-1', code: 'AUTO' })
      const result = await service.findByCode('AUTO', 'b-1', mockTx)
      expect(result).toEqual({ id: 'at-1', code: 'AUTO' })
      expect(mockRepo.findByCode).toHaveBeenCalledWith('AUTO', 'b-1', mockTx)
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

    it('should pass branchId to findByCode when provided', async () => {
      const existing = { id: 'at-1', code: 'AUTO', name: 'Auto', branchId: 'b-1' }
      mockRepo.findByCode.mockResolvedValueOnce(existing)

      const result = await service.findOrCreate({ code: 'AUTO', name: 'Auto', branchId: 'b-1' })
      expect(result).toEqual(existing)
      expect(mockRepo.findByCode).toHaveBeenCalledWith('AUTO', 'b-1', undefined)
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

  describe('create', () => {
    it('should delegate create to repository', async () => {
      const input: AssetTypeInsert = { code: 'BOAT', name: 'Barco' }
      const created = { id: 'at-4', ...input }
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.create(input)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input, undefined)
    })

    it('should propagate tx in create', async () => {
      const mockTx = {} as any
      const input: AssetTypeInsert = { code: 'BOAT', name: 'Barco' }
      const created = { id: 'at-4', ...input }
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.create(input, mockTx)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input, mockTx)
    })
  })

  describe('list', () => {
    it('should return list of asset types with filters', async () => {
      const list = [{ id: 'at-1', code: 'AUTO', name: 'Auto' }]
      mockRepo.list.mockResolvedValueOnce(list)

      const result = await service.list({ branchId: 'b-1' } as any)
      expect(result).toEqual(list)
      expect(mockRepo.list).toHaveBeenCalledWith({ branchId: 'b-1' }, undefined)
    })

    it('should support calling list with no parameters', async () => {
      const list = [{ id: 'at-1', code: 'AUTO', name: 'Auto' }]
      mockRepo.list.mockResolvedValueOnce(list)

      const result = await service.list()
      expect(result).toEqual(list)
      expect(mockRepo.list).toHaveBeenCalledWith(undefined, undefined)
    })

    it('should support calling list with empty filters object', async () => {
      mockRepo.list.mockResolvedValueOnce([])
      const result = await service.list({})
      expect(result).toEqual([])
      expect(mockRepo.list).toHaveBeenCalledWith({}, undefined)
    })

    it('should propagate tx in list', async () => {
      const mockTx = {} as any
      mockRepo.list.mockResolvedValueOnce([])
      const result = await service.list({ branchId: 'b-1' } as any, mockTx)
      expect(result).toEqual([])
      expect(mockRepo.list).toHaveBeenCalledWith({ branchId: 'b-1' }, mockTx)
    })
  })
})

