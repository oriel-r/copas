import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPoliciesService } from './policies.service'
import type { ExtractedPolicy, Policy, PolicyInsert } from '@copas/contracts'

describe('policies.service', () => {
  let mockPoliciesRepo: any
  let mockCompaniesService: any
  let mockBranchesService: any
  let mockInsuredsService: any
  let mockAssetTypesService: any
  let mockAssetsService: any
  let mockPaymentMethodsService: any
  let mockPolicyAssetsRepo: any
  let mockPolicyCoveragesRepo: any
  let mockPolicyInstallmentsService: any
  let mockTransactionRunner: any
  let service: ReturnType<typeof createPoliciesService>

  beforeEach(() => {
    mockPoliciesRepo = {
      findById: vi.fn(),
      findByNumber: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
    }
    mockCompaniesService = {
      findOrCreate: vi.fn(),
      getById: vi.fn(),
    }
    mockBranchesService = {
      findOrCreate: vi.fn(),
      getById: vi.fn(),
    }
    mockInsuredsService = {
      findOrCreate: vi.fn(),
      getById: vi.fn(),
    }
    mockAssetTypesService = {
      findOrCreate: vi.fn(),
      getById: vi.fn(),
    }
    mockAssetsService = {
      findOrCreate: vi.fn(),
      getById: vi.fn(),
    }
    mockPaymentMethodsService = {
      findOrCreate: vi.fn(),
      getById: vi.fn(),
    }
    mockPolicyAssetsRepo = {
      create: vi.fn(),
      findByPolicyId: vi.fn(),
    }
    mockPolicyCoveragesRepo = {
      createMany: vi.fn(),
      findByPolicyId: vi.fn(),
    }
    mockPolicyInstallmentsService = {
      createMany: vi.fn(),
      getByPolicyId: vi.fn(),
    }
    // Transaction runner executes callback immediately passing a mock tx
    mockTransactionRunner = vi.fn().mockImplementation(async (callback) => {
      const mockTx = { id: 'mock-tx-1' }
      return await callback(mockTx)
    })

    service = createPoliciesService({
      policiesRepository: mockPoliciesRepo,
      companiesService: mockCompaniesService,
      branchesService: mockBranchesService,
      insuredsService: mockInsuredsService,
      assetTypesService: mockAssetTypesService,
      assetsService: mockAssetsService,
      paymentMethodsService: mockPaymentMethodsService,
      policyAssetsRepository: mockPolicyAssetsRepo,
      policyCoveragesRepository: mockPolicyCoveragesRepo,
      policyInstallmentsService: mockPolicyInstallmentsService,
      transactionRunner: mockTransactionRunner,
    })
  })

  describe('getById', () => {
    it('should return policy when found', async () => {
      const policy: Policy = {
        id: 'pol-1',
        organizationId: 'org-1',
        companyId: 'comp-1',
        insuredId: 'ins-1',
        paymentMethodId: 'pm-1',
        uploadedBy: 'usr-1',
        producedBy: null,
        policyNumber: 'POL-123',
        premiumTotal: 100000,
        currency: 'ARS',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        effectiveEndDate: null,
        status: 'active',
        billingFrequency: 'monthly',
        documentUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockPoliciesRepo.findById.mockResolvedValueOnce(policy)

      const result = await service.getById('pol-1')
      expect(result).toEqual(policy)
      expect(mockPoliciesRepo.findById).toHaveBeenCalledWith('pol-1', undefined)
    })
  })

  describe('create', () => {
    it('should create policy through repository', async () => {
      const input: PolicyInsert = {
        organizationId: 'org-1',
        companyId: 'comp-1',
        insuredId: 'ins-1',
        uploadedBy: 'usr-1',
        policyNumber: 'POL-777',
      }
      const created = { id: 'pol-1', ...input }
      mockPoliciesRepo.create.mockResolvedValueOnce(created)

      const result = await service.create(input)
      expect(result).toEqual(created)
      expect(mockPoliciesRepo.create).toHaveBeenCalledWith(input, undefined)
    })
  })

  describe('update', () => {
    it('should update policy through repository', async () => {
      const updateData = { premiumTotal: 150000 }
      const updated = { id: 'pol-1', ...updateData }
      mockPoliciesRepo.update.mockResolvedValueOnce(updated)

      const result = await (service as any).update('pol-1', updateData as any)
      expect(result).toEqual(updated)
      expect(mockPoliciesRepo.update).toHaveBeenCalledWith('pol-1', updateData, undefined)
    })
  })

  describe('delete', () => {
    it('should delete policy through repository', async () => {
      mockPoliciesRepo.delete.mockResolvedValueOnce(true)

      const result = await (service as any).delete('pol-1')
      expect(result).toBe(true)
      expect(mockPoliciesRepo.delete).toHaveBeenCalledWith('pol-1', undefined)
    })
  })

  describe('list', () => {
    it('should list policies with filter through repository', async () => {
      const filter = { organizationId: 'org-1', status: 'active' }
      const list = [{ id: 'pol-1', policyNumber: 'POL-1' }]
      mockPoliciesRepo.list.mockResolvedValueOnce(list)

      const result = await service.list(filter as any)
      expect(result).toEqual(list)
      expect(mockPoliciesRepo.list).toHaveBeenCalledWith(filter, undefined)
    })
  })

  describe('findByNumber', () => {
    it('should find policy by number through repository', async () => {
      const policy = { id: 'pol-1', policyNumber: 'POL-123' }
      mockPoliciesRepo.findByNumber.mockResolvedValueOnce(policy)

      const result = await (service as any).findByNumber('org-1', 'POL-123')
      expect(result).toEqual(policy)
      expect(mockPoliciesRepo.findByNumber).toHaveBeenCalledWith('org-1', 'POL-123', undefined)
    })
  })


  describe('processAiResult', () => {
    const validExtractedPolicy: ExtractedPolicy = {
      company: {
        name: 'SANCOR',
        code: 'SANCOR_01',
      },
      branch: {
        code: 'AUTO',
      },
      policy: {
        policyNumber: 'POL-998877',
        premiumTotal: 180000,
        currency: 'ARS',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        billingFrequency: 'monthly',
      },
      insured: {
        fullName: 'JUAN CARLOS PEREZ',
        cuit: '20123456789',
        email: 'juan.perez@example.com',
        phone: '541112345678',
        birthDate: '1985-05-15',
      },
      assetType: {
        code: 'AUTO',
      },
      asset: {
        properties: {
          PATENTE: 'AF123JK',
          MARCA: 'TOYOTA',
          MODELO: 'COROLLA',
          ANIO: 2023,
        },
      },
      paymentMethod: {
        code: 'AUTOMATICO_DEBITO',
      },
      coverages: [
        {
          name: 'RESPONSABILIDAD CIVIL',
          limit: 25000000,
          franchise: null,
        },
        {
          name: 'TODO RIESGO CON FRANQUICIA',
          limit: 30000000,
          franchise: 150000,
        },
      ],
      installments: [
        {
          installmentNumber: 1,
          dueDate: '2026-01-10',
          totalAmount: 15000,
        },
        {
          installmentNumber: 2,
          dueDate: '2026-02-10',
          totalAmount: 15000,
        },
      ],
    }

    it('should orchestrate all domain entities within a single transaction and create the policy', async () => {
      const mockCompany = { id: 'comp-10', code: 'SANCOR_01', name: 'SANCOR' }
      const mockBranch = { id: 'branch-10', code: 'AUTO', name: 'Automotores' }
      const mockAssetType = { id: 'at-10', code: 'AUTO', name: 'Auto' }
      const mockInsured = { id: 'ins-10', cuit: '20123456789', fullName: 'JUAN CARLOS PEREZ' }
      const mockAsset = { id: 'ast-10', properties: validExtractedPolicy.asset.properties }
      const mockPaymentMethod = { id: 'pm-10', code: 'AUTOMATICO_DEBITO', name: 'Débito' }
      const mockCreatedPolicy = {
        id: 'pol-100',
        organizationId: 'org-1',
        companyId: 'comp-10',
        insuredId: 'ins-10',
        paymentMethodId: 'pm-10',
        uploadedBy: 'usr-1',
        policyNumber: 'POL-998877',
        premiumTotal: 180000,
        currency: 'ARS',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        status: 'active',
        billingFrequency: 'monthly',
      }

      mockCompaniesService.findOrCreate.mockResolvedValueOnce(mockCompany)
      mockBranchesService.findOrCreate.mockResolvedValueOnce(mockBranch)
      mockAssetTypesService.findOrCreate.mockResolvedValueOnce(mockAssetType)
      mockInsuredsService.findOrCreate.mockResolvedValueOnce(mockInsured)
      mockAssetsService.findOrCreate.mockResolvedValueOnce(mockAsset)
      mockPaymentMethodsService.findOrCreate.mockResolvedValueOnce(mockPaymentMethod)
      mockPoliciesRepo.create.mockResolvedValueOnce(mockCreatedPolicy)
      mockPolicyAssetsRepo.create.mockResolvedValueOnce({ policyId: 'pol-100', assetId: 'ast-10' })
      mockPolicyCoveragesRepo.createMany.mockResolvedValueOnce([{ id: 'cov-1' }, { id: 'cov-2' }])
      mockPolicyInstallmentsService.createMany.mockResolvedValueOnce([{ id: 'inst-1' }, { id: 'inst-2' }])

      const result = await service.processAiResult({
        organizationId: 'org-1',
        uploadedBy: 'usr-1',
        aiExtractionResultId: 'ai-res-1',
        structuredPayload: validExtractedPolicy,
      })

      expect(mockTransactionRunner).toHaveBeenCalled()
      expect(mockCompaniesService.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'SANCOR', code: 'SANCOR_01' }),
        expect.anything(),
      )
      expect(mockBranchesService.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'AUTO' }),
        expect.anything(),
      )
      expect(mockAssetTypesService.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'AUTO' }),
        expect.anything(),
      )
      expect(mockInsuredsService.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          uploadedBy: 'usr-1',
          cuit: '20123456789',
          fullName: 'JUAN CARLOS PEREZ',
        }),
        expect.anything(),
      )
      expect(mockAssetsService.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          insuredId: 'ins-10',
          assetTypeId: 'at-10',
          uploadedBy: 'usr-1',
          properties: validExtractedPolicy.asset.properties,
        }),
        expect.anything(),
      )
      expect(mockPaymentMethodsService.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'AUTOMATICO_DEBITO' }),
        expect.anything(),
      )
      expect(mockPoliciesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          companyId: 'comp-10',
          insuredId: 'ins-10',
          paymentMethodId: 'pm-10',
          uploadedBy: 'usr-1',
          policyNumber: 'POL-998877',
          premiumTotal: 180000,
          currency: 'ARS',
          startDate: '2026-01-01',
          endDate: '2027-01-01',
        }),
        expect.anything(),
      )
      expect(mockPolicyAssetsRepo.create).toHaveBeenCalledWith(
        { policyId: 'pol-100', assetId: 'ast-10' },
        expect.anything(),
      )
      expect(mockPolicyCoveragesRepo.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ policyId: 'pol-100' }),
        ]),
        expect.anything(),
      )
      expect(mockPolicyInstallmentsService.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ policyId: 'pol-100', installmentNumber: 1 }),
          expect.objectContaining({ policyId: 'pol-100', installmentNumber: 2 }),
        ]),
        expect.anything(),
      )

      expect(result).toBeDefined()
    })

    it('should handle edge cases: nullable premiumTotal and empty coverages array', async () => {
      const minimalPayload: ExtractedPolicy = {
        ...validExtractedPolicy,
        policy: {
          ...validExtractedPolicy.policy,
          premiumTotal: null,
        },
        coverages: [],
      }

      mockCompaniesService.findOrCreate.mockResolvedValueOnce({ id: 'comp-1' })
      mockBranchesService.findOrCreate.mockResolvedValueOnce({ id: 'branch-1' })
      mockAssetTypesService.findOrCreate.mockResolvedValueOnce({ id: 'at-1' })
      mockInsuredsService.findOrCreate.mockResolvedValueOnce({ id: 'ins-1' })
      mockAssetsService.findOrCreate.mockResolvedValueOnce({ id: 'ast-1' })
      mockPaymentMethodsService.findOrCreate.mockResolvedValueOnce({ id: 'pm-1' })
      mockPoliciesRepo.create.mockResolvedValueOnce({ id: 'pol-200' })
      mockPolicyAssetsRepo.create.mockResolvedValueOnce({ policyId: 'pol-200', assetId: 'ast-1' })
      mockPolicyInstallmentsService.createMany.mockResolvedValueOnce([])

      await service.processAiResult({
        organizationId: 'org-1',
        uploadedBy: 'usr-1',
        aiExtractionResultId: 'ai-res-2',
        structuredPayload: minimalPayload,
      })

      expect(mockPoliciesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ premiumTotal: null }),
        expect.anything(),
      )
      expect(mockPolicyCoveragesRepo.createMany).not.toHaveBeenCalled()
    })

    it('should reject and rollback if any dependency throws an error', async () => {
      mockCompaniesService.findOrCreate.mockRejectedValueOnce(new Error('DB Connection Failed'))

      await expect(
        service.processAiResult({
          organizationId: 'org-1',
          uploadedBy: 'usr-1',
          aiExtractionResultId: 'ai-res-3',
          structuredPayload: validExtractedPolicy,
        }),
      ).rejects.toThrow('DB Connection Failed')

      expect(mockPoliciesRepo.create).not.toHaveBeenCalled()
    })
  })
})
