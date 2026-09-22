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
      findByIdWithDetails: vi.fn(),
      findByCuitExcludingId: vi.fn(),
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
      expect(typeof s.getDetailById).toBe('function')
      expect(typeof s.updateProfile).toBe('function')
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

  describe('getDetailById', () => {
    const baseInsured = {
      id: 'ins-1',
      organizationId: 'org-1',
      uploadedBy: 'usr-1',
      cuit: '20-30000000-3',
      fullName: 'JUAN PEREZ',
      phone: '+541112345678',
      email: 'juan@example.com',
      birthDate: '1985-05-15',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }

    const activePolicy1 = {
      id: 'pol-1',
      policyNumber: 'POL-001',
      companyId: 'comp-1',
      companyName: 'Federación Patronal',
      branchId: 'br-1',
      branchName: 'Automotores',
      assetDescription: 'Toyota Corolla 2020',
      startDate: '2026-01-01',
      endDate: '2027-01-01',
      status: 'active' as const,
    }

    const activePolicy2 = {
      id: 'pol-2',
      policyNumber: 'POL-002',
      companyId: 'comp-2',
      companyName: 'Sancor Seguros',
      branchId: 'br-2',
      branchName: 'Hogar',
      assetDescription: 'Casa Country',
      startDate: '2026-06-01',
      endDate: '2027-06-01',
      status: 'active' as const,
    }

    const expiredPolicy = {
      id: 'pol-3',
      policyNumber: 'POL-003',
      companyId: 'comp-1',
      companyName: 'Federación Patronal',
      branchId: 'br-1',
      branchName: 'Automotores',
      assetDescription: 'Toyota Corolla 2018',
      startDate: '2024-01-01',
      endDate: '2025-01-01',
      status: 'expired' as const,
    }

    it('should return detailed insured calculating activePoliciesCount, totalPoliciesCount, unique companies, and latestPolicy as the most recent active policy', async () => {
      mockRepo.findByIdWithDetails.mockResolvedValueOnce({
        ...baseInsured,
        policies: [activePolicy1, activePolicy2, expiredPolicy],
      })

      const result = await service.getDetailById('ins-1')

      expect(result).toBeDefined()
      expect(result.id).toBe('ins-1')
      expect(result.activePoliciesCount).toBe(2)
      expect(result.totalPoliciesCount).toBe(3)
      expect(result.companies).toEqual(['Federación Patronal', 'Sancor Seguros'])
      expect(result.latestPolicy).toEqual(activePolicy2)
      expect(mockRepo.findByIdWithDetails).toHaveBeenCalledWith('ins-1', undefined)
    })

    it('should return activePoliciesCount=0, totalPoliciesCount=0, companies=[], and latestPolicy=null when insured has no policies', async () => {
      mockRepo.findByIdWithDetails.mockResolvedValueOnce({
        ...baseInsured,
        policies: [],
      })

      const result = await service.getDetailById('ins-1')

      expect(result).toBeDefined()
      expect(result.activePoliciesCount).toBe(0)
      expect(result.totalPoliciesCount).toBe(0)
      expect(result.companies).toEqual([])
      expect(result.latestPolicy).toBeNull()
    })

    it('should return latestPolicy as the last historical policy when insured has only non-active policies (expired/cancelled)', async () => {
      const cancelledPolicy = {
        id: 'pol-0',
        policyNumber: 'POL-000',
        companyId: 'comp-1',
        companyName: 'Federación Patronal',
        branchId: 'br-1',
        branchName: 'Automotores',
        assetDescription: 'Moto Honda',
        startDate: '2023-01-01',
        endDate: '2023-06-01',
        status: 'cancelled' as const,
      }

      mockRepo.findByIdWithDetails.mockResolvedValueOnce({
        ...baseInsured,
        policies: [cancelledPolicy, expiredPolicy],
      })

      const result = await service.getDetailById('ins-1')

      expect(result).toBeDefined()
      expect(result.activePoliciesCount).toBe(0)
      expect(result.totalPoliciesCount).toBe(2)
      expect(result.companies).toEqual(['Federación Patronal'])
      expect(result.latestPolicy).toEqual(expiredPolicy)
    })

    it('should return null if insured does not exist or has deletedAt != null', async () => {
      mockRepo.findByIdWithDetails.mockResolvedValueOnce(null)

      const result = await service.getDetailById('ins-nonexistent')

      expect(result).toBeNull()
      expect(mockRepo.findByIdWithDetails).toHaveBeenCalledWith('ins-nonexistent', undefined)
    })

    it('should propagate tx to findByIdWithDetails', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.findByIdWithDetails.mockResolvedValueOnce(null)

      await service.getDetailById('ins-1', mockTx)

      expect(mockRepo.findByIdWithDetails).toHaveBeenCalledWith('ins-1', mockTx)
    })
  })

  describe('updateProfile', () => {
    const existingInsured = {
      id: 'ins-1',
      organizationId: 'org-1',
      uploadedBy: 'usr-1',
      cuit: '20-30000000-3',
      fullName: 'JUAN PEREZ',
      phone: '+541112345678',
      email: 'juan@example.com',
      birthDate: '1985-05-15',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }

    it('should successfully update valid fields (fullName, phone, email, birthDate)', async () => {
      const updateData = {
        fullName: 'JUAN CARLOS PEREZ',
        phone: '+541198765432',
        email: 'juan.carlos@example.com',
        birthDate: '1985-05-20',
      }
      const updated = { ...existingInsured, ...updateData }

      mockRepo.findById.mockResolvedValueOnce(existingInsured)
      mockRepo.update.mockResolvedValueOnce(updated)

      const result = await service.updateProfile('ins-1', updateData)

      expect(result).toEqual(updated)
      expect(mockRepo.update).toHaveBeenCalledWith('ins-1', expect.objectContaining(updateData), undefined)
    })

    it('should allow updating with same CUIT without throwing conflict', async () => {
      const updateData = { cuit: '20-30000000-3', fullName: 'JUAN PEREZ RENAMED' }
      const updated = { ...existingInsured, fullName: 'JUAN PEREZ RENAMED' }

      mockRepo.findById.mockResolvedValueOnce(existingInsured)
      mockRepo.update.mockResolvedValueOnce(updated)

      const result = await service.updateProfile('ins-1', updateData)

      expect(result).toEqual(updated)
      expect(mockRepo.findByCuitExcludingId).not.toHaveBeenCalled()
      expect(mockRepo.update).toHaveBeenCalled()
    })

    it('should throw conflict error "CUIT already registered" if CUIT belongs to another insured in the organization', async () => {
      const newCuit = '27-30000000-8'
      mockRepo.findById.mockResolvedValueOnce(existingInsured)
      mockRepo.findByCuitExcludingId.mockResolvedValueOnce({
        id: 'ins-other',
        cuit: newCuit,
        organizationId: 'org-1',
      })

      await expect(service.updateProfile('ins-1', { cuit: newCuit })).rejects.toThrow(
        'CUIT already registered',
      )
      expect(mockRepo.update).not.toHaveBeenCalled()
    })

    it('should return null when insured to update does not exist or is soft-deleted', async () => {
      mockRepo.findById.mockResolvedValueOnce(null)

      const result = await service.updateProfile('ins-nonexistent', { fullName: 'TEST' })

      expect(result).toBeNull()
      expect(mockRepo.update).not.toHaveBeenCalled()
    })

    it('should propagate tx to findById, findByCuitExcludingId, and update', async () => {
      const mockTx = { isTx: true } as any
      const newCuit = '27-30000000-8'
      const updateData = { cuit: newCuit }

      mockRepo.findById.mockResolvedValueOnce(existingInsured)
      mockRepo.findByCuitExcludingId.mockResolvedValueOnce(null)
      mockRepo.update.mockResolvedValueOnce({ ...existingInsured, cuit: newCuit })

      const result = await service.updateProfile('ins-1', updateData, mockTx)

      expect(mockRepo.findById).toHaveBeenCalledWith('ins-1', mockTx)
      expect(mockRepo.findByCuitExcludingId).toHaveBeenCalledWith('org-1', newCuit, 'ins-1', mockTx)
      expect(mockRepo.update).toHaveBeenCalledWith('ins-1', expect.objectContaining(updateData), mockTx)
    })
  })
})

