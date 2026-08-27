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

    it('should return null or throw when company not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null)

      const result = await service.getById('comp-unknown')
      expect(result).toBeNull()
    })

    it('should propagate transaction tx', async () => {
      const mockTx = {} as any
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
  })

  describe('findOrCreate', () => {
    it('should return existing company if found by code', async () => {
      const existing = { id: 'comp-1', code: 'ALLIANZ', name: 'ALLIANZ SEGUROS' }
      mockRepo.findByCode.mockResolvedValueOnce(existing)

      const result = await service.findOrCreate({ code: 'ALLIANZ', name: 'ALLIANZ SEGUROS' })
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
      const mockTx = {} as any
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
  })

  describe('list', () => {
    it('should delegate list to repository', async () => {
      const list = [{ id: 'comp-1', code: 'SANCOR', name: 'SANCOR' }]
      mockRepo.list.mockResolvedValueOnce(list)

      const result = await service.list({ limit: 10 })
      expect(result).toEqual(list)
      expect(mockRepo.list).toHaveBeenCalledWith({ limit: 10 }, undefined)
    })
  })
})
