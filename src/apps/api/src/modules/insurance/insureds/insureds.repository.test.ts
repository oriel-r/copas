import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createInsuredsRepository } from './insureds.repository'
import type { InsuredInsert } from '@copas/contracts'

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

describe('insureds.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createInsuredsRepository>

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
    repository = createInsuredsRepository({ db: mockDb })
  })

  describe('D1 vs Drizzle wrapping', () => {
    it('should wrap D1 database with drizzle lazily when db.prepare is a function', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createInsuredsRepository({ db: mockD1 as any })
      await repo.findById('ins-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap D1 database with drizzle lazily when passed positionally', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createInsuredsRepository(mockD1 as any)
      await repo.findById('ins-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap tx with drizzle if tx has prepare function', async () => {
      const mockTx = { prepare: vi.fn() }
      await repository.findById('ins-1', mockTx as any)
      expect(mockDrizzle).toHaveBeenCalledWith(mockTx)
    })
  })

  describe('findById', () => {
    it('should return insured by id', async () => {
      const insured = {
        id: 'ins-1',
        organizationId: 'org-1',
        uploadedBy: 'usr-1',
        cuit: '20123456789',
        fullName: 'JUAN PEREZ',
        phone: '541112345678',
        email: 'juan@example.com',
        birthDate: '1985-05-15',
      }
      mockDb.limit.mockResolvedValueOnce([insured])

      const result = await repository.findById('ins-1')
      expect(result).toEqual(insured)
    })

    it('should return null if not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findById('ins-999')
      expect(result).toBeNull()
    })

    it('should use transaction tx in findById if provided', async () => {
      const insured = { id: 'ins-1', fullName: 'JUAN PEREZ' }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([insured]),
      }

      const result = await repository.findById('ins-1', mockTx as any)
      expect(result).toEqual(insured)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('findByCuit', () => {
    it('should return insured by organizationId and cuit', async () => {
      const insured = { id: 'ins-1', organizationId: 'org-1', cuit: '20123456789' }
      mockDb.limit.mockResolvedValueOnce([insured])

      const result = await repository.findByCuit('org-1', '20123456789')
      expect(result).toEqual(insured)
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should return null if cuit not found in organization', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findByCuit('org-1', '99999999999')
      expect(result).toBeNull()
    })

    it('should use transaction tx if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([{ id: 'ins-1', cuit: '20123456789' }]),
      }

      const result = await repository.findByCuit('org-1', '20123456789', mockTx as any)
      expect(result).toEqual({ id: 'ins-1', cuit: '20123456789' })
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('should insert and return new insured', async () => {
      const input: InsuredInsert = {
        organizationId: 'org-1',
        uploadedBy: 'usr-1',
        cuit: '20123456789',
        fullName: 'JUAN PEREZ',
        phone: '541112345678',
        email: 'juan@example.com',
        birthDate: '1985-05-15',
      }
      const created = { id: 'ins-2', ...input }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.create(input)
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should use transaction tx in create if provided', async () => {
      const input: InsuredInsert = {
        organizationId: 'org-1',
        uploadedBy: 'usr-1',
        cuit: '20123456789',
        fullName: 'JUAN PEREZ',
      }
      const created = { id: 'ins-3', ...input }
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
    it('should update insured fields', async () => {
      const updated = { id: 'ins-1', fullName: 'JUAN MANUEL PEREZ' }
      mockDb.returning.mockResolvedValueOnce([updated])

      const result = await repository.update('ins-1', { fullName: 'JUAN MANUEL PEREZ' })
      expect(result).toEqual(updated)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should use transaction tx in update if provided', async () => {
      const updated = { id: 'ins-1', fullName: 'JUAN TX' }
      const mockTx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([updated]),
      }

      const result = await repository.update('ins-1', { fullName: 'JUAN TX' }, mockTx as any)
      expect(result).toEqual(updated)
      expect(mockTx.update).toHaveBeenCalled()
      expect(mockDb.update).not.toHaveBeenCalled()
    })
  })

  describe('list', () => {
    it('should return list of insureds with default limit and offset', async () => {
      const list = [{ id: 'ins-1', fullName: 'JUAN PEREZ' }]
      mockDb.offset.mockResolvedValueOnce(list)

      const result = await repository.list({ organizationId: 'org-1' })
      expect(result).toEqual(list)
      expect(mockDb.limit).toHaveBeenCalledWith(50)
      expect(mockDb.offset).toHaveBeenCalledWith(0)
    })

    it('should use custom limit and offset if provided', async () => {
      mockDb.offset.mockResolvedValueOnce([])

      await repository.list({ organizationId: 'org-1', limit: 10, offset: 20 })
      expect(mockDb.limit).toHaveBeenCalledWith(10)
      expect(mockDb.offset).toHaveBeenCalledWith(20)
    })

    it('should use transaction tx in list if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValueOnce([]),
      }

      await repository.list({ organizationId: 'org-1' }, mockTx as any)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })
})


