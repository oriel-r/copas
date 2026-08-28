import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createInsuredsRepository } from './insureds.repository'
import type { InsuredInsert } from '@copas/contracts'

describe('insureds.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createInsuredsRepository>

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
    }
    repository = createInsuredsRepository({ db: mockDb })
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
    })
  })

  describe('list', () => {
    it('should return list of insureds', async () => {
      const list = [{ id: 'ins-1', fullName: 'JUAN PEREZ' }]
      mockDb.offset.mockResolvedValueOnce(list)

      const result = await repository.list({ organizationId: 'org-1', limit: 10, offset: 0 })
      expect(result).toEqual(list)
    })
  })
})

