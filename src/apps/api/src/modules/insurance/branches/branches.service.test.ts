import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBranchesService } from './branches.service'
import type { Branch, BranchInsert } from '@copas/contracts'

describe('branches.service', () => {
  let mockRepo: any
  let service: ReturnType<typeof createBranchesService>

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByCode: vi.fn(),
      create: vi.fn(),
      list: vi.fn(),
    }
    service = createBranchesService({ branchesRepository: mockRepo })
  })

  describe('initialization / DI', () => {
    it('should support options object dependency injection', async () => {
      const svc = createBranchesService({ branchesRepository: mockRepo })
      mockRepo.findById.mockResolvedValueOnce({ id: 'branch-1' })
      const res = await svc.getById('branch-1')
      expect(res).toEqual({ id: 'branch-1' })
    })

    it('should support positional repository dependency injection', async () => {
      const svc = createBranchesService(mockRepo as any)
      mockRepo.findById.mockResolvedValueOnce({ id: 'branch-1' })
      const res = await svc.getById('branch-1')
      expect(res).toEqual({ id: 'branch-1' })
    })

    it('should handle undefined repository in factory without throwing', () => {
      const svc = createBranchesService(undefined as any)
      expect(svc).toBeDefined()
    })
  })

  describe('getById', () => {
    it('should return branch when found', async () => {
      const branch: Branch = { id: 'branch-1', code: 'AUTO', name: 'Automotores', createdAt: new Date(), updatedAt: new Date(), deletedAt: null }
      mockRepo.findById.mockResolvedValueOnce(branch)

      const result = await service.getById('branch-1')
      expect(result).toEqual(branch)
      expect(mockRepo.findById).toHaveBeenCalledWith('branch-1', undefined)
    })

    it('should return null when not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null)
      const result = await service.getById('branch-999')
      expect(result).toBeNull()
      expect(mockRepo.findById).toHaveBeenCalledWith('branch-999', undefined)
    })

    it('should propagate tx in getById', async () => {
      const mockTx = {} as any
      const branch = { id: 'branch-1', code: 'AUTO' }
      mockRepo.findById.mockResolvedValueOnce(branch)

      const result = await service.getById('branch-1', mockTx)
      expect(result).toEqual(branch)
      expect(mockRepo.findById).toHaveBeenCalledWith('branch-1', mockTx)
    })
  })

  describe('findByCode', () => {
    it('should return branch by code', async () => {
      const branch = { id: 'branch-1', code: 'MOTO', name: 'Motovehículos' }
      mockRepo.findByCode.mockResolvedValueOnce(branch)

      const result = await service.findByCode('MOTO')
      expect(result).toEqual(branch)
      expect(mockRepo.findByCode).toHaveBeenCalledWith('MOTO', undefined)
    })

    it('should return null when branch code is not found', async () => {
      mockRepo.findByCode.mockResolvedValueOnce(null)

      const result = await service.findByCode('NONEXISTENT')
      expect(result).toBeNull()
      expect(mockRepo.findByCode).toHaveBeenCalledWith('NONEXISTENT', undefined)
    })

    it('should propagate tx in findByCode', async () => {
      const mockTx = {} as any
      const branch = { id: 'branch-1', code: 'MOTO' }
      mockRepo.findByCode.mockResolvedValueOnce(branch)

      const result = await service.findByCode('MOTO', mockTx)
      expect(result).toEqual(branch)
      expect(mockRepo.findByCode).toHaveBeenCalledWith('MOTO', mockTx)
    })
  })

  describe('findOrCreate', () => {
    it('should return existing branch if found by code', async () => {
      const existing = { id: 'branch-1', code: 'HOME', name: 'Hogar' }
      mockRepo.findByCode.mockResolvedValueOnce(existing)

      const result = await service.findOrCreate({ code: 'HOME', name: 'Hogar' })
      expect(result).toEqual(existing)
      expect(mockRepo.create).not.toHaveBeenCalled()
    })

    it('should create new branch if not found', async () => {
      const input: BranchInsert = { code: 'RC', name: 'Responsabilidad Civil' }
      const created = { id: 'branch-2', ...input }
      mockRepo.findByCode.mockResolvedValueOnce(null)
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.findOrCreate(input)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input, undefined)
    })

    it('should propagate transaction tx', async () => {
      const mockTx = {} as any
      const input = { code: 'ART', name: 'Riesgos del Trabajo' }
      mockRepo.findByCode.mockResolvedValueOnce(null)
      mockRepo.create.mockResolvedValueOnce({ id: 'branch-3', ...input })

      await service.findOrCreate(input, mockTx)
      expect(mockRepo.findByCode).toHaveBeenCalledWith('ART', mockTx)
      expect(mockRepo.create).toHaveBeenCalledWith(input, mockTx)
    })
  })

  describe('create', () => {
    it('should delegate create to repository', async () => {
      const input: BranchInsert = { code: 'LIFE', name: 'Vida' }
      const created = { id: 'branch-5', ...input }
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.create(input)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input, undefined)
    })

    it('should propagate tx in create', async () => {
      const mockTx = {} as any
      const input: BranchInsert = { code: 'LIFE', name: 'Vida' }
      const created = { id: 'branch-5', ...input }
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.create(input, mockTx)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input, mockTx)
    })
  })

  describe('list', () => {
    it('should return list from repository with filters', async () => {
      const branches = [{ id: 'branch-1', code: 'AUTO', name: 'Automotores' }]
      mockRepo.list.mockResolvedValueOnce(branches)

      const result = await service.list({ limit: 5 } as any)
      expect(result).toEqual(branches)
      expect(mockRepo.list).toHaveBeenCalledWith({ limit: 5 }, undefined)
    })

    it('should support calling list with no parameters', async () => {
      const branches = [{ id: 'branch-1', code: 'AUTO', name: 'Automotores' }]
      mockRepo.list.mockResolvedValueOnce(branches)

      const result = await service.list()
      expect(result).toEqual(branches)
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

      const result = await service.list({ limit: 5 } as any, mockTx)
      expect(result).toEqual([])
      expect(mockRepo.list).toHaveBeenCalledWith({ limit: 5 }, mockTx)
    })
  })
})

