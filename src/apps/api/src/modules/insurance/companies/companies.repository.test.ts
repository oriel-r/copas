import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCompaniesRepository } from './companies.repository'
import type { CompanyInsert } from '@copas/contracts'

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

describe('companies.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createCompaniesRepository>

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
    repository = createCompaniesRepository({ db: mockDb })
  })

  describe('D1 vs Drizzle wrapping', () => {
    it('should wrap D1 database with drizzle lazily when db.prepare is a function', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createCompaniesRepository({ db: mockD1 as any })
      await repo.findById('comp-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap D1 database with drizzle lazily when passed positionally', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createCompaniesRepository(mockD1 as any)
      await repo.findById('comp-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap tx with drizzle if tx has prepare function', async () => {
      const mockTx = { prepare: vi.fn() }
      await repository.findById('comp-1', mockTx as any)
      expect(mockDrizzle).toHaveBeenCalledWith(mockTx)
    })
  })

  describe('findById', () => {
    it('should return company by id', async () => {
      const company = { id: 'comp-1', code: 'SANCOR', name: 'SANCOR SEGUROS', createdAt: new Date(), updatedAt: new Date(), deletedAt: null }
      mockDb.limit.mockResolvedValueOnce([company])

      const result = await repository.findById('comp-1')
      expect(result).toEqual(company)
      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should return null if company not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findById('comp-999')
      expect(result).toBeNull()
    })

    it('should use transaction tx if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([{ id: 'comp-1' }]),
      }

      const result = await repository.findById('comp-1', mockTx as any)
      expect(result).toEqual({ id: 'comp-1' })
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('findByCode', () => {
    it('should return company by code', async () => {
      const company = { id: 'comp-1', code: 'SANCOR', name: 'SANCOR' }
      mockDb.limit.mockResolvedValueOnce([company])

      const result = await repository.findByCode('SANCOR')
      expect(result).toEqual(company)
    })

    it('should return null if code not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findByCode('UNKNOWN')
      expect(result).toBeNull()
    })

    it('should use transaction tx if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([{ id: 'comp-1', code: 'ALLIANZ' }]),
      }

      const result = await repository.findByCode('ALLIANZ', mockTx as any)
      expect(result).toEqual({ id: 'comp-1', code: 'ALLIANZ' })
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('findByName', () => {
    it('should return company by name', async () => {
      const company = { id: 'comp-1', code: 'SANCOR', name: 'SANCOR' }
      mockDb.limit.mockResolvedValueOnce([company])

      const result = await repository.findByName('SANCOR')
      expect(result).toEqual(company)
    })

    it('should return null if name not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findByName('UNKNOWN')
      expect(result).toBeNull()
    })

    it('should use transaction tx in findByName when provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([{ id: 'comp-1', name: 'SANCOR' }]),
      }

      const result = await repository.findByName('SANCOR', mockTx as any)
      expect(result).toEqual({ id: 'comp-1', name: 'SANCOR' })
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('should insert and return new company', async () => {
      const input: CompanyInsert = { code: 'FED_PAT', name: 'FEDERACION PATRONAL' }
      const created = { id: 'comp-2', ...input }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.create(input)
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should use transaction tx if provided', async () => {
      const input: CompanyInsert = { code: 'MAPFRE', name: 'MAPFRE' }
      const created = { id: 'comp-3', ...input }
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
    it('should update company and return updated record', async () => {
      const updated = { id: 'comp-1', name: 'SANCOR UPDATED' }
      mockDb.returning.mockResolvedValueOnce([updated])

      const result = await repository.update('comp-1', { name: 'SANCOR UPDATED' })
      expect(result).toEqual(updated)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should use transaction tx in update if provided', async () => {
      const updated = { id: 'comp-1', name: 'SANCOR TX' }
      const mockTx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([updated]),
      }

      const result = await repository.update('comp-1', { name: 'SANCOR TX' }, mockTx as any)
      expect(result).toEqual(updated)
      expect(mockTx.update).toHaveBeenCalled()
      expect(mockDb.update).not.toHaveBeenCalled()
    })
  })

  describe('list', () => {
    it('should return list of companies with default limit and offset', async () => {
      const list = [
        { id: 'comp-1', code: 'SANCOR', name: 'SANCOR' },
        { id: 'comp-2', code: 'ZURICH', name: 'ZURICH' },
      ]
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

    it('should return empty list when no companies exist', async () => {
      mockDb.offset.mockResolvedValueOnce([])

      const result = await repository.list()
      expect(result).toEqual([])
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




