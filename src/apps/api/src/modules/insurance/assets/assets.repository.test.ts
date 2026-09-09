import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAssetsRepository } from './assets.repository'
import type { AssetInsert } from '@copas/contracts'

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

describe('assets.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createAssetsRepository>

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
    repository = createAssetsRepository({ db: mockDb })
  })

  describe('D1 vs Drizzle wrapping', () => {
    it('should wrap D1 database with drizzle lazily when db.prepare is a function', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createAssetsRepository({ db: mockD1 as any })
      await repo.findById('ast-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap D1 database with drizzle lazily when passed positionally', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createAssetsRepository(mockD1 as any)
      await repo.findById('ast-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap tx with drizzle if tx has prepare function', async () => {
      const mockTx = { prepare: vi.fn() }
      await repository.findById('ast-1', mockTx as any)
      expect(mockDrizzle).toHaveBeenCalledWith(mockTx)
    })
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

    it('should use transaction tx in findById if provided', async () => {
      const asset = { id: 'ast-1', externalReference: 'REF-TX' }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([asset]),
      }

      const result = await repository.findById('ast-1', mockTx as any)
      expect(result).toEqual(asset)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
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
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should use transaction tx in findByInsuredId if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce([{ id: 'ast-1', insuredId: 'ins-1' }]),
      }

      const result = await repository.findByInsuredId('ins-1', mockTx as any)
      expect(result).toEqual([{ id: 'ast-1', insuredId: 'ins-1' }])
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('findByInsuredAndType', () => {
    it('should return asset for insured and asset type', async () => {
      const asset = { id: 'ast-1', insuredId: 'ins-1', assetTypeId: 'at-1' }
      mockDb.limit.mockResolvedValueOnce([asset])

      const result = await repository.findByInsuredAndType('ins-1', 'at-1')
      expect(result).toEqual(asset)
      expect(mockDb.where).toHaveBeenCalled()
      expect(mockDb.limit).toHaveBeenCalledWith(1)
    })

    it('should return null if not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findByInsuredAndType('ins-1', 'at-1')
      expect(result).toBeNull()
    })

    it('should use transaction tx in findByInsuredAndType if provided', async () => {
      const asset = { id: 'ast-1', insuredId: 'ins-1', assetTypeId: 'at-1' }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([asset]),
      }

      const result = await repository.findByInsuredAndType('ins-1', 'at-1', mockTx as any)
      expect(result).toEqual(asset)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
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
      expect(mockDb.insert).not.toHaveBeenCalled()
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

    it('should use transaction tx in update if provided', async () => {
      const updated = { id: 'ast-1', properties: { PATENTE: 'TX123' } }
      const mockTx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([updated]),
      }

      const result = await repository.update('ast-1', { properties: { PATENTE: 'TX123' } }, mockTx as any)
      expect(result).toEqual(updated)
      expect(mockTx.update).toHaveBeenCalled()
      expect(mockDb.update).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete asset by id', async () => {
      mockDb.where.mockResolvedValueOnce({ rowCount: 1 })

      await repository.delete('ast-1')
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should use transaction tx in delete if provided', async () => {
      const mockTx = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce({ rowCount: 1 }),
      }

      await repository.delete('ast-1', mockTx as any)
      expect(mockTx.delete).toHaveBeenCalled()
      expect(mockDb.delete).not.toHaveBeenCalled()
    })
  })

  describe('list', () => {
    it('should return list of assets with default limit and offset', async () => {
      const list = [{ id: 'ast-1' }]
      mockDb.offset.mockResolvedValueOnce(list)

      const result = await repository.list({})
      expect(result).toEqual(list)
      expect(mockDb.limit).toHaveBeenCalledWith(50)
      expect(mockDb.offset).toHaveBeenCalledWith(0)
    })

    it('should use custom limit and offset if provided', async () => {
      mockDb.offset.mockResolvedValueOnce([])

      await repository.list({ limit: 10, offset: 20 })
      expect(mockDb.limit).toHaveBeenCalledWith(10)
      expect(mockDb.offset).toHaveBeenCalledWith(20)
    })

    it('should filter by insuredId if provided', async () => {
      mockDb.offset.mockResolvedValueOnce([])

      await repository.list({ insuredId: 'ins-1' })
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should filter by assetTypeId if provided', async () => {
      mockDb.offset.mockResolvedValueOnce([])

      await repository.list({ assetTypeId: 'at-1' })
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should use transaction tx in list if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValueOnce([]),
      }

      await repository.list({}, mockTx as any)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })
})


