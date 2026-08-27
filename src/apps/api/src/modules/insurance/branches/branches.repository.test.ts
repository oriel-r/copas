import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBranchesRepository } from './branches.repository'
import type { BranchInsert } from '@copas/contracts'

describe('branches.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createBranchesRepository>

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
    }
    repository = createBranchesRepository({ db: mockDb })
  })

  describe('findById', () => {
    it('should return branch by id', async () => {
      const branch = { id: 'branch-1', code: 'AUTO', name: 'Automotores' }
      mockDb.limit.mockResolvedValueOnce([branch])

      const result = await repository.findById('branch-1')
      expect(result).toEqual(branch)
    })

    it('should return null if branch not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findById('branch-999')
      expect(result).toBeNull()
    })

    it('should use transaction tx if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([{ id: 'branch-1' }]),
      }

      const result = await repository.findById('branch-1', mockTx as any)
      expect(result).toEqual({ id: 'branch-1' })
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('findByCode', () => {
    it('should return branch by code', async () => {
      const branch = { id: 'branch-1', code: 'HOME', name: 'Hogar' }
      mockDb.limit.mockResolvedValueOnce([branch])

      const result = await repository.findByCode('HOME')
      expect(result).toEqual(branch)
    })

    it('should return null if code not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findByCode('UNKNOWN')
      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should insert and return new branch', async () => {
      const input: BranchInsert = { code: 'VIDA', name: 'Vida' }
      const created = { id: 'branch-2', ...input }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.create(input)
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
    })
  })

  describe('list', () => {
    it('should return list of branches', async () => {
      const list = [{ id: 'branch-1', code: 'AUTO', name: 'Automotores' }]
      mockDb.offset.mockResolvedValueOnce(list)

      const result = await repository.list()
      expect(result).toEqual(list)
    })
  })
})
