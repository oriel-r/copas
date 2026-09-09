import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createInsuredsService } from './insureds.service'
import type { Insured, InsuredInsert } from '@copas/contracts'

describe('insureds.service', () => {
  let mockRepo: any
  let service: ReturnType<typeof createInsuredsService>

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByCuit: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
    }
    service = createInsuredsService({ insuredsRepository: mockRepo })
  })

  describe('constructor and dependency injection', () => {
    it('should initialize with object argument containing insuredsRepository', () => {
      const s = createInsuredsService({ insuredsRepository: mockRepo })
      expect(s).toBeDefined()
      expect(typeof s.getById).toBe('function')
      expect(typeof s.findByCuit).toBe('function')
      expect(typeof s.findOrCreate).toBe('function')
      expect(typeof s.create).toBe('function')
      expect(typeof s.update).toBe('function')
      expect(typeof s.list).toBe('function')
    })

    it('should initialize with positional argument insuredsRepository', () => {
      const s = createInsuredsService(mockRepo as any)
      expect(s).toBeDefined()
      expect(typeof s.getById).toBe('function')
    })
  })

  describe('getById', () => {
    it('should return insured when found', async () => {
      const insured: Insured = {
        id: 'ins-1',
        organizationId: 'org-1',
        uploadedBy: 'usr-1',
        cuit: '20123456789',
        fullName: 'JUAN PEREZ',
        phone: '541112345678',
        email: 'juan@example.com',
        birthDate: '1985-05-15',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockRepo.findById.mockResolvedValueOnce(insured)

      const result = await service.getById('ins-1')
      expect(result).toEqual(insured)
      expect(mockRepo.findById).toHaveBeenCalledWith('ins-1', undefined)
    })

    it('should return null when insured not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null)

      const result = await service.getById('ins-non-existent')
      expect(result).toBeNull()
      expect(mockRepo.findById).toHaveBeenCalledWith('ins-non-existent', undefined)
    })

    it('should propagate tx to findById', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.findById.mockResolvedValueOnce(null)

      await service.getById('ins-1', mockTx)
      expect(mockRepo.findById).toHaveBeenCalledWith('ins-1', mockTx)
    })
  })

  describe('findByCuit', () => {
    it('should return insured by organizationId and cuit', async () => {
      const insured = { id: 'ins-1', organizationId: 'org-1', cuit: '20123456789' }
      mockRepo.findByCuit.mockResolvedValueOnce(insured)

      const result = await service.findByCuit('org-1', '20123456789')
      expect(result).toEqual(insured)
      expect(mockRepo.findByCuit).toHaveBeenCalledWith('org-1', '20123456789', undefined)
    })

    it('should return null when cuit not found in organization', async () => {
      mockRepo.findByCuit.mockResolvedValueOnce(null)

      const result = await service.findByCuit('org-1', '20999999999')
      expect(result).toBeNull()
      expect(mockRepo.findByCuit).toHaveBeenCalledWith('org-1', '20999999999', undefined)
    })

    it('should propagate tx to findByCuit', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.findByCuit.mockResolvedValueOnce(null)

      await service.findByCuit('org-1', '20123456789', mockTx)
      expect(mockRepo.findByCuit).toHaveBeenCalledWith('org-1', '20123456789', mockTx)
    })
  })

  describe('findOrCreate', () => {
    it('should return existing insured if found by cuit in organization', async () => {
      const existing = { id: 'ins-1', organizationId: 'org-1', cuit: '20123456789', fullName: 'JUAN PEREZ' }
      mockRepo.findByCuit.mockResolvedValueOnce(existing)

      const result = await service.findOrCreate({
        organizationId: 'org-1',
        uploadedBy: 'usr-1',
        cuit: '20123456789',
        fullName: 'JUAN PEREZ',
      })
      expect(result).toEqual(existing)
      expect(mockRepo.create).not.toHaveBeenCalled()
    })

    it('should create new insured if cuit does not exist in organization', async () => {
      const input: InsuredInsert = {
        organizationId: 'org-1',
        uploadedBy: 'usr-1',
        cuit: '27987654321',
        fullName: 'MARIA LOPEZ',
        phone: '541198765432',
        email: 'maria@example.com',
        birthDate: '1990-08-20',
      }
      const created = { id: 'ins-2', ...input }
      mockRepo.findByCuit.mockResolvedValueOnce(null)
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.findOrCreate(input)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input, undefined)
    })

    it('should propagate transaction tx', async () => {
      const mockTx = {} as any
      const input = {
        organizationId: 'org-1',
        uploadedBy: 'usr-1',
        cuit: '20333333333',
        fullName: 'CARLOS GOMEZ',
      }
      mockRepo.findByCuit.mockResolvedValueOnce(null)
      mockRepo.create.mockResolvedValueOnce({ id: 'ins-3', ...input })

      await service.findOrCreate(input, mockTx)
      expect(mockRepo.findByCuit).toHaveBeenCalledWith('org-1', '20333333333', mockTx)
      expect(mockRepo.create).toHaveBeenCalledWith(input, mockTx)
    })
  })

  describe('create', () => {
    it('should create insured and delegate to repository', async () => {
      const input: InsuredInsert = {
        organizationId: 'org-1',
        uploadedBy: 'usr-1',
        cuit: '20123456789',
        fullName: 'JUAN PEREZ',
      }
      const created = { id: 'ins-1', ...input }
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.create(input)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input, undefined)
    })

    it('should propagate tx to create', async () => {
      const mockTx = { isTx: true } as any
      const input: InsuredInsert = {
        organizationId: 'org-1',
        uploadedBy: 'usr-1',
        cuit: '20444444444',
        fullName: 'ANA LOPEZ',
      }
      mockRepo.create.mockResolvedValueOnce({ id: 'ins-tx', ...input })

      await service.create(input, mockTx)
      expect(mockRepo.create).toHaveBeenCalledWith(input, mockTx)
    })
  })

  describe('update', () => {
    it('should update insured and delegate to repository', async () => {
      const updated = { id: 'ins-1', phone: '541199998888' }
      mockRepo.update.mockResolvedValueOnce(updated)

      const result = await service.update('ins-1', { phone: '541199998888' })
      expect(result).toEqual(updated)
      expect(mockRepo.update).toHaveBeenCalledWith('ins-1', { phone: '541199998888' }, undefined)
    })

    it('should propagate tx to update', async () => {
      const mockTx = { isTx: true } as any
      const updateData = { phone: '541100001111' }
      mockRepo.update.mockResolvedValueOnce({ id: 'ins-1', ...updateData })

      await service.update('ins-1', updateData, mockTx)
      expect(mockRepo.update).toHaveBeenCalledWith('ins-1', updateData, mockTx)
    })
  })

  describe('list', () => {
    it('should list insureds and delegate filters to repository', async () => {
      const list = [{ id: 'ins-1', fullName: 'JUAN PEREZ' }]
      mockRepo.list.mockResolvedValueOnce(list)

      const result = await service.list({ organizationId: 'org-1' } as any)
      expect(result).toEqual(list)
      expect(mockRepo.list).toHaveBeenCalledWith({ organizationId: 'org-1' }, undefined)
    })

    it('should handle list with undefined filters and propagate tx', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.list.mockResolvedValueOnce([])

      const result = await service.list(undefined, mockTx)
      expect(result).toEqual([])
      expect(mockRepo.list).toHaveBeenCalledWith(undefined, mockTx)
    })
  })
})

