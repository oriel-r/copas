import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAssetsRepository } from './assets.repository'
import type { AssetInsert } from '@copas/contracts'

describe('assets.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createAssetsRepository>

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
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }
    repository = createAssetsRepository({ db: mockDb })
  })

  describe('findById', () => {
    it('should return asset by id', async () => {
      const asset = {
        id: 'ast-1',
        insuredId: 'ins-1',
        assetTypeId: 'at-1',
        uploadedBy: 'usr-1',
        externalReference: 'REF-1',
        properties: { PATENTE: 'AB123CD', MARCA: 'TOYOTA' },
      }
      mockDb.limit.mockResolvedValueOnce([asset])

      const result = await repository.findById('ast-1')
      expect(result).toEqual(asset)
    })

    it('should return null if not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findById('ast-999')
      expect(result).toBeNull()
    })
  })

  describe('findByInsuredId', () => {
    it('should return assets for insured', async () => {
      const assets = [
        { id: 'ast-1', insuredId: 'ins-1', assetTypeId: 'at-1' },
        { id: 'ast-2', insuredId: 'ins-1', assetTypeId: 'at-2' },
      ]
      mockDb.where.mockResolvedValueOnce(assets)

      const result = await repository.findByInsuredId('ins-1')
      expect(result).toEqual(assets)
    })
  })

  describe('create', () => {
    it('should insert and return new asset', async () => {
      const input: AssetInsert = {
        insuredId: 'ins-1',
        assetTypeId: 'at-1',
        uploadedBy: 'usr-1',
        properties: { PATENTE: 'AB123CD' },
      }
      const created = { id: 'ast-3', ...input }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.create(input)
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should use transaction tx if provided', async () => {
      const input: AssetInsert = {
        insuredId: 'ins-1',
        assetTypeId: 'at-1',
        uploadedBy: 'usr-1',
        properties: { PATENTE: 'XY987ZT' },
      }
      const created = { id: 'ast-4', ...input }
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

  describe('update', () => {
    it('should update asset properties', async () => {
      const updated = { id: 'ast-1', properties: { PATENTE: 'NEW123' } }
      mockDb.returning.mockResolvedValueOnce([updated])

      const result = await repository.update('ast-1', { properties: { PATENTE: 'NEW123' } })
      expect(result).toEqual(updated)
      expect(mockDb.update).toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete asset by id', async () => {
      mockDb.where.mockResolvedValueOnce({ rowCount: 1 })

      await repository.delete('ast-1')
      expect(mockDb.delete).toHaveBeenCalled()
    })
  })
})
