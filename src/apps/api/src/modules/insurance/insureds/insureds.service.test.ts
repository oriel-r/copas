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
    })
  })

  describe('findByCuit', () => {
    it('should return insured by organizationId and cuit', async () => {
      const insured = { id: 'ins-1', organizationId: 'org-1', cuit: '20123456789' }
      mockRepo.findByCuit.mockResolvedValueOnce(insured)

      const result = await service.findByCuit('org-1', '20123456789')
      expect(result).toEqual(insured)
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
  })

  describe('update', () => {
    it('should update insured and delegate to repository', async () => {
      const updated = { id: 'ins-1', phone: '541199998888' }
      mockRepo.update.mockResolvedValueOnce(updated)

      const result = await service.update('ins-1', { phone: '541199998888' })
      expect(result).toEqual(updated)
      expect(mockRepo.update).toHaveBeenCalledWith('ins-1', { phone: '541199998888' }, undefined)
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
  })
})

