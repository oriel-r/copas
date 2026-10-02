import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAssetsService } from './assets.service'
import type { Asset, AssetInsert } from '@copas/contracts'

describe('assets.service', () => {
  let mockRepo: any
  let service: ReturnType<typeof createAssetsService>

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByInsuredId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
    service = createAssetsService({ assetsRepository: mockRepo })
  })

  describe('constructor and dependency injection', () => {
    it('should initialize with object argument containing assetsRepository', () => {
      const s = createAssetsService({ assetsRepository: mockRepo })
      expect(s).toBeDefined()
      expect(typeof s.getById).toBe('function')
      expect(typeof s.findByInsuredId).toBe('function')
      expect(typeof s.findOrCreate).toBe('function')
      expect(typeof s.create).toBe('function')
      expect(typeof s.update).toBe('function')
      expect(typeof s.delete).toBe('function')
    })

    it('should initialize with positional argument assetsRepository', () => {
      const s = createAssetsService(mockRepo as any)
      expect(s).toBeDefined()
      expect(typeof s.getById).toBe('function')
    })
  })

  describe('getById', () => {
    it('should return asset when found', async () => {
      const asset: Asset = {
        id: 'ast-1',
        insuredId: 'ins-1',
        assetTypeId: 'at-1',
        uploadedBy: 'usr-1',
        externalReference: 'REF-1',
        properties: { PATENTE: 'AB123CD' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockRepo.findById.mockResolvedValueOnce(asset)

      const result = await service.getById('ast-1')
      expect(result).toEqual(asset)
      expect(mockRepo.findById).toHaveBeenCalledWith('ast-1', undefined)
    })

    it('should return null when asset is not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null)

      const result = await service.getById('ast-non-existent')
      expect(result).toBeNull()
      expect(mockRepo.findById).toHaveBeenCalledWith('ast-non-existent', undefined)
    })

    it('should propagate tx to findById', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.findById.mockResolvedValueOnce(null)

      await service.getById('ast-1', mockTx)
      expect(mockRepo.findById).toHaveBeenCalledWith('ast-1', mockTx)
    })
  })

  describe('findByInsuredId', () => {
    it('should return all assets for an insured', async () => {
      const assets = [{ id: 'ast-1', insuredId: 'ins-1' }]
      mockRepo.findByInsuredId.mockResolvedValueOnce(assets)

      const result = await service.findByInsuredId('ins-1')
      expect(result).toEqual(assets)
      expect(mockRepo.findByInsuredId).toHaveBeenCalledWith('ins-1', undefined)
    })

    it('should propagate tx to findByInsuredId', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.findByInsuredId.mockResolvedValueOnce([])

      await service.findByInsuredId('ins-1', mockTx)
      expect(mockRepo.findByInsuredId).toHaveBeenCalledWith('ins-1', mockTx)
    })
  })

  describe('findOrCreate', () => {
    it('should return existing asset if matching properties found for insured', async () => {
      const existing = {
        id: 'ast-1',
        insuredId: 'ins-1',
        assetTypeId: 'at-1',
        properties: { PATENTE: 'AB123CD', MARCA: 'TOYOTA' },
      }
      mockRepo.findByInsuredId.mockResolvedValueOnce([existing])

      const result = await service.findOrCreate({
        insuredId: 'ins-1',
        assetTypeId: 'at-1',
        uploadedBy: 'usr-1',
        properties: { PATENTE: 'AB123CD', MARCA: 'TOYOTA' },
      })
      expect(result).toEqual(existing)
      expect(mockRepo.create).not.toHaveBeenCalled()
    })

    it('should create new asset when existing asset has different property values', async () => {
      const existing = {
        id: 'ast-diff-prop',
        insuredId: 'ins-1',
        assetTypeId: 'at-1',
        properties: { PATENTE: 'DIFF999', MARCA: 'FORD' },
      }
      const input: AssetInsert = {
        insuredId: 'ins-1',
        assetTypeId: 'at-1',
        uploadedBy: 'usr-1',
        properties: { PATENTE: 'AB123CD', MARCA: 'TOYOTA' },
      }
      mockRepo.findByInsuredId.mockResolvedValueOnce([existing])
      mockRepo.create.mockResolvedValueOnce({ id: 'ast-created', ...input })

      const result = await service.findOrCreate(input)
      expect(result.id).toBe('ast-created')
      expect(mockRepo.create).toHaveBeenCalledWith(input, undefined)
    })

    it('should create new asset if existing asset has different assetTypeId', async () => {
      const existing = {
        id: 'ast-other-type',
        insuredId: 'ins-1',
        assetTypeId: 'at-other',
        properties: { PATENTE: 'AB123CD' },
      }
      const input: AssetInsert = {
        insuredId: 'ins-1',
        assetTypeId: 'at-target',
        uploadedBy: 'usr-1',
        properties: { PATENTE: 'AB123CD' },
      }
      mockRepo.findByInsuredId.mockResolvedValueOnce([existing])
      mockRepo.create.mockResolvedValueOnce({ id: 'ast-new', ...input })

      const result = await service.findOrCreate(input)
      expect(result.id).toBe('ast-new')
      expect(mockRepo.create).toHaveBeenCalledWith(input, undefined)
    })

    it('should create new asset if no matching asset found for insured', async () => {
      const input: AssetInsert = {
        insuredId: 'ins-1',
        assetTypeId: 'at-1',
        uploadedBy: 'usr-1',
        properties: { PATENTE: 'ZZ999YY' },
      }
      const created = { id: 'ast-2', ...input }
      mockRepo.findByInsuredId.mockResolvedValueOnce([])
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.findOrCreate(input)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input, undefined)
    })

    it('should propagate transaction tx', async () => {
      const mockTx = { isTx: true } as any
      const input: AssetInsert = {
        insuredId: 'ins-1',
        assetTypeId: 'at-1',
        uploadedBy: 'usr-1',
        properties: { PATENTE: 'NEW999' },
      }
      mockRepo.findByInsuredId.mockResolvedValueOnce([])
      mockRepo.create.mockResolvedValueOnce({ id: 'ast-3', ...input })

      await service.findOrCreate(input, mockTx)
      expect(mockRepo.findByInsuredId).toHaveBeenCalledWith('ins-1', mockTx)
      expect(mockRepo.create).toHaveBeenCalledWith(input, mockTx)
    })
  })

  describe('create', () => {
    it('should create asset via repository', async () => {
      const input: AssetInsert = {
        insuredId: 'ins-1',
        assetTypeId: 'at-1',
        uploadedBy: 'usr-1',
        properties: { PATENTE: 'AB123CD' },
      }
      const created = { id: 'ast-1', ...input }
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.create(input)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input, undefined)
    })

    it('should propagate tx to create', async () => {
      const mockTx = { isTx: true } as any
      const input: AssetInsert = {
        insuredId: 'ins-1',
        assetTypeId: 'at-1',
        uploadedBy: 'usr-1',
      }
      mockRepo.create.mockResolvedValueOnce({ id: 'ast-tx', ...input })

      await service.create(input, mockTx)
      expect(mockRepo.create).toHaveBeenCalledWith(input, mockTx)
    })
  })

  describe('update', () => {
    it('should update asset and delegate to repository', async () => {
      const updateData = { properties: { PATENTE: 'AB123CD', COLOR: 'RED' } }
      const updated = { id: 'ast-1', ...updateData }
      mockRepo.update.mockResolvedValueOnce(updated)

      const result = await service.update('ast-1', updateData as any)
      expect(result).toEqual(updated)
      expect(mockRepo.update).toHaveBeenCalledWith('ast-1', updateData, undefined)
    })

    it('should propagate tx to update', async () => {
      const mockTx = { isTx: true } as any
      const updateData = { properties: { COLOR: 'BLUE' } }
      mockRepo.update.mockResolvedValueOnce({ id: 'ast-1', ...updateData })

      await service.update('ast-1', updateData as any, mockTx)
      expect(mockRepo.update).toHaveBeenCalledWith('ast-1', updateData, mockTx)
    })
  })

  describe('delete', () => {
    it('should delete asset and delegate to repository', async () => {
      mockRepo.delete.mockResolvedValueOnce(true)

      const result = await service.delete('ast-1')
      expect(result).toBe(true)
      expect(mockRepo.delete).toHaveBeenCalledWith('ast-1', undefined)
    })

    it('should propagate tx to delete', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.delete.mockResolvedValueOnce(false)

      const result = await service.delete('ast-1', mockTx)
      expect(result).toBe(false)
      expect(mockRepo.delete).toHaveBeenCalledWith('ast-1', mockTx)
    })
  })
})

