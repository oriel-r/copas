import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCompaniesRepository } from './companies.repository'
import type { CompanyInsert } from '@copas/contracts'

describe('companies.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createCompaniesRepository>

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
    repository = createCompaniesRepository({ db: mockDb })
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

      const result = await (repository as any).update('comp-1', { name: 'SANCOR UPDATED' })
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

      const result = await (repository as any).update('comp-1', { name: 'SANCOR TX' }, mockTx as any)
      expect(result).toEqual(updated)
      expect(mockTx.update).toHaveBeenCalled()
    })
  })

  describe('list', () => {
    it('should return list of companies', async () => {
      const list = [
        { id: 'comp-1', code: 'SANCOR', name: 'SANCOR' },
        { id: 'comp-2', code: 'ZURICH', name: 'ZURICH' },
      ]
      mockDb.offset.mockResolvedValueOnce(list)

      const result = await repository.list({ limit: 10, offset: 0 })
      expect(result).toEqual(list)
    })

    it('should return empty list when no companies exist', async () => {
      mockDb.offset.mockResolvedValueOnce([])

      const result = await repository.list()
      expect(result).toEqual([])
    })
  })
})



