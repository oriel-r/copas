import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCompaniesService } from './companies.service'
import type { Company, CompanyInsert } from '@copas/contracts'

describe('companies.service', () => {
  let mockRepo: any
  let service: ReturnType<typeof createCompaniesService>

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByCode: vi.fn(),
      findByName: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
    }
    service = createCompaniesService({ companiesRepository: mockRepo })
  })

  describe('constructor and dependency injection', () => {
    it('should initialize with object argument containing companiesRepository', () => {
      const s = createCompaniesService({ companiesRepository: mockRepo })
      expect(s).toBeDefined()
      expect(typeof s.getById).toBe('function')
      expect(typeof s.findByCode).toBe('function')
      expect(typeof s.findByName).toBe('function')
      expect(typeof s.findOrCreate).toBe('function')
      expect(typeof s.create).toBe('function')
      expect(typeof s.update).toBe('function')
    })

    it('should initialize with positional argument companiesRepository', () => {
      const s = createCompaniesService(mockRepo as any)
      expect(s).toBeDefined()
      expect(typeof s.getById).toBe('function')
    })
  })

  describe('getById', () => {
    it('should return company when found', async () => {
      const company: Company = {
        id: 'comp-1',
        code: 'SANCOR',
        name: 'SANCOR SEGUROS',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockRepo.findById.mockResolvedValueOnce(company)

      const result = await service.getById('comp-1')
      expect(result).toEqual(company)
      expect(mockRepo.findById).toHaveBeenCalledWith('comp-1', undefined)
    })

    it('should return null when company not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null)

      const result = await service.getById('comp-unknown')
      expect(result).toBeNull()
      expect(mockRepo.findById).toHaveBeenCalledWith('comp-unknown', undefined)
    })

    it('should propagate transaction tx', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.findById.mockResolvedValueOnce({ id: 'comp-1' })

      await service.getById('comp-1', mockTx)
      expect(mockRepo.findById).toHaveBeenCalledWith('comp-1', mockTx)
    })
  })

  describe('findByCode', () => {
    it('should return company by code', async () => {
      const company = { id: 'comp-1', code: 'ZURICH', name: 'ZURICH' }
      mockRepo.findByCode.mockResolvedValueOnce(company)

      const result = await service.findByCode('ZURICH')
      expect(result).toEqual(company)
      expect(mockRepo.findByCode).toHaveBeenCalledWith('ZURICH', undefined)
    })

    it('should return null when code not found', async () => {
      mockRepo.findByCode.mockResolvedValueOnce(null)

      const result = await service.findByCode('UNKNOWN_CODE')
      expect(result).toBeNull()
      expect(mockRepo.findByCode).toHaveBeenCalledWith('UNKNOWN_CODE', undefined)
    })

    it('should propagate tx to findByCode', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.findByCode.mockResolvedValueOnce(null)

      await service.findByCode('ZURICH', mockTx)
      expect(mockRepo.findByCode).toHaveBeenCalledWith('ZURICH', mockTx)
    })
  })

  describe('findOrCreate', () => {
    it('should return existing company if found by code', async () => {
      const existing = { id: 'comp-1', code: 'ALLIANZ', name: 'ALLIANZ SEGUROS' }
      mockRepo.findByCode.mockResolvedValueOnce(existing)

      const result = await service.findOrCreate({ code: 'ALLIANZ', name: 'ALLIANZ SEGUROS' })
      expect(result).toEqual(existing)
      expect(mockRepo.create).not.toHaveBeenCalled()
    })

    it('should return existing company if found by name when code is whitespace', async () => {
      const existing = { id: 'comp-2', code: 'MAPFRE', name: 'MAPFRE' }
      mockRepo.findByCode.mockResolvedValueOnce(null)
      mockRepo.findByName.mockResolvedValueOnce(existing)

      const result = await service.findOrCreate({ code: '   ', name: 'MAPFRE' })
      expect(result).toEqual(existing)
      expect(mockRepo.create).not.toHaveBeenCalled()
    })

    it('should return existing company if found by name when code is empty', async () => {
      const existing = { id: 'comp-2', code: 'MAPFRE', name: 'MAPFRE' }
      mockRepo.findByCode.mockResolvedValueOnce(null)
      mockRepo.findByName.mockResolvedValueOnce(existing)

      const result = await service.findOrCreate({ code: '', name: 'MAPFRE' })
      expect(result).toEqual(existing)
      expect(mockRepo.create).not.toHaveBeenCalled()
    })

    it('should create new company if neither code nor name exist', async () => {
      const newCompanyInput: CompanyInsert = { code: 'FED_PAT', name: 'FEDERACION PATRONAL' }
      const createdCompany = { id: 'comp-3', ...newCompanyInput }
      mockRepo.findByCode.mockResolvedValueOnce(null)
      mockRepo.findByName.mockResolvedValueOnce(null)
      mockRepo.create.mockResolvedValueOnce(createdCompany)

      const result = await service.findOrCreate(newCompanyInput)
      expect(result).toEqual(createdCompany)
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'FEDERACION PATRONAL' }),
        undefined,
      )
    })

    it('should propagate transaction tx during findOrCreate', async () => {
      const mockTx = { isTx: true } as any
      const newCompanyInput = { code: 'BERKLEY', name: 'BERKLEY' }
      mockRepo.findByCode.mockResolvedValueOnce(null)
      mockRepo.findByName.mockResolvedValueOnce(null)
      mockRepo.create.mockResolvedValueOnce({ id: 'comp-4', ...newCompanyInput })

      await service.findOrCreate(newCompanyInput, mockTx)
      expect(mockRepo.findByCode).toHaveBeenCalledWith('BERKLEY', mockTx)
      expect(mockRepo.create).toHaveBeenCalledWith(expect.any(Object), mockTx)
    })
  })

  describe('create', () => {
    it('should create company and delegate to repository', async () => {
      const input: CompanyInsert = { code: 'SAN_CRISTOBAL', name: 'SAN CRISTOBAL' }
      const created = { id: 'comp-5', ...input }
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.create(input)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input, undefined)
    })

    it('should propagate tx to create', async () => {
      const mockTx = { isTx: true } as any
      const input: CompanyInsert = { code: 'PRUDENTIAL', name: 'PRUDENTIAL' }
      mockRepo.create.mockResolvedValueOnce({ id: 'comp-tx', ...input })

      await service.create(input, mockTx)
      expect(mockRepo.create).toHaveBeenCalledWith(input, mockTx)
    })
  })

  describe('findByName', () => {
    it('should delegate findByName to repository', async () => {
      const company = { id: 'comp-1', code: 'ZURICH', name: 'ZURICH' }
      mockRepo.findByName.mockResolvedValueOnce(company)

      const result = await service.findByName('ZURICH')
      expect(result).toEqual(company)
      expect(mockRepo.findByName).toHaveBeenCalledWith('ZURICH', undefined)
    })

    it('should return null when name not found', async () => {
      mockRepo.findByName.mockResolvedValueOnce(null)

      const result = await service.findByName('UNKNOWN_NAME')
      expect(result).toBeNull()
      expect(mockRepo.findByName).toHaveBeenCalledWith('UNKNOWN_NAME', undefined)
    })

    it('should propagate tx to findByName', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.findByName.mockResolvedValueOnce(null)

      await service.findByName('ZURICH', mockTx)
      expect(mockRepo.findByName).toHaveBeenCalledWith('ZURICH', mockTx)
    })
  })

  describe('update', () => {
    it('should delegate update to repository', async () => {
      const updated = { id: 'comp-1', code: 'SANCOR', name: 'SANCOR SEGUROS UPDATED' }
      mockRepo.update.mockResolvedValueOnce(updated)

      const result = await service.update('comp-1', { name: 'SANCOR SEGUROS UPDATED' })
      expect(result).toEqual(updated)
      expect(mockRepo.update).toHaveBeenCalledWith('comp-1', { name: 'SANCOR SEGUROS UPDATED' }, undefined)
    })

    it('should propagate tx to update', async () => {
      const mockTx = { isTx: true } as any
      const updateData = { name: 'NEW NAME' }
      mockRepo.update.mockResolvedValueOnce({ id: 'comp-1', ...updateData })

      await service.update('comp-1', updateData, mockTx)
      expect(mockRepo.update).toHaveBeenCalledWith('comp-1', updateData, mockTx)
    })
  })
})



