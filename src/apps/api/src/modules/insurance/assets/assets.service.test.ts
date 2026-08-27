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
    })
  })

  describe('findByInsuredId', () => {
    it('should return all assets for an insured', async () => {
      const assets = [{ id: 'ast-1', insuredId: 'ins-1' }]
      mockRepo.findByInsuredId.mockResolvedValueOnce(assets)

      const result = await service.findByInsuredId('ins-1')
      expect(result).toEqual(assets)
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
      const mockTx = {} as any
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
    })
  })
})
