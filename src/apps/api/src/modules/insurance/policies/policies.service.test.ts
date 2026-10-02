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
  let mockFilesService: any
  let mockAiQueue: any
  let mockAiExtractionResultsRepo: any
  let service: ReturnType<typeof createPoliciesService>

  beforeEach(() => {
    mockPoliciesRepo = {
      findById: vi.fn(),
      findByNumber: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
      createExtractionResult: vi.fn().mockResolvedValue('extraction-res-1'),
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

    mockFilesService = {
      upload: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      generateUploadUrl: vi.fn(),
      generateTemporaryPublicUrl: vi.fn().mockResolvedValue('https://mock-r2.cloudflarestorage.com/temp-url-123'),
    }

    mockAiQueue = {
      send: vi.fn().mockResolvedValue(undefined),
    }

    mockAiExtractionResultsRepo = {
      create: vi.fn().mockResolvedValue({ id: 'extraction-res-1' }),
      findById: vi.fn().mockResolvedValue({ id: 'extraction-res-1' }),
      update: vi.fn().mockResolvedValue({ id: 'extraction-res-1' }),
    }

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
      filesService: mockFilesService,
      aiQueue: mockAiQueue,
      aiExtractionResultsRepository: mockAiExtractionResultsRepo,
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

    it('should return null when policy is not found', async () => {
      mockPoliciesRepo.findById.mockResolvedValueOnce(null)
      const result = await service.getById('pol-999')
      expect(result).toBeNull()
      expect(mockPoliciesRepo.findById).toHaveBeenCalledWith('pol-999', undefined)
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

    it('should return null when updating non-existent policy', async () => {
      mockPoliciesRepo.update.mockResolvedValueOnce(null)
      const result = await (service as any).update('pol-999', { premiumTotal: 100 })
      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete policy through repository', async () => {
      mockPoliciesRepo.delete.mockResolvedValueOnce(true)

      const result = await (service as any).delete('pol-1')
      expect(result).toBe(true)
      expect(mockPoliciesRepo.delete).toHaveBeenCalledWith('pol-1', undefined)
    })

    it('should return false or null when deleting non-existent policy', async () => {
      mockPoliciesRepo.delete.mockResolvedValueOnce(false)
      const result = await (service as any).delete('pol-nonexistent')
      expect([false, null]).toContain(result)
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

    it('should return null when policy number is not found', async () => {
      mockPoliciesRepo.findByNumber.mockResolvedValueOnce(null)
      const result = await (service as any).findByNumber('org-1', 'POL-NOTFOUND')
      expect(result).toBeNull()
    })

    it('should handle undefined or empty maybeNumber', async () => {
      mockPoliciesRepo.findByNumber.mockResolvedValueOnce(null)
      const result = await (service as any).findByNumber('org-1', '')
      expect([null, undefined]).toContain(result)
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

    it('should handle company without code, branch fallback to AUTO, and insured nullable fields', async () => {
      const payload: any = {
        ...validExtractedPolicy,
        company: {
          name: 'LA SEGUNDA',
          code: '',
        },
        branch: {
          code: '',
        },
        insured: {
          fullName: 'MARIA LOPEZ',
          cuit: '',
          email: '',
          phone: '',
          birthDate: '',
        },
        installments: [
          {
            installmentNumber: 1,
            dueDate: '2026-03-01',
            totalAmount: 25000,
          },
          {
            installmentNumber: 2,
            dueDate: '2026-04-01',
            totalAmount: 30000,
          },
        ],
      }

      mockCompaniesService.findOrCreate.mockResolvedValueOnce({ id: 'comp-la-segunda' })
      mockBranchesService.findOrCreate.mockResolvedValueOnce({ id: 'branch-auto' })
      mockAssetTypesService.findOrCreate.mockResolvedValueOnce({ id: 'at-auto' })
      mockInsuredsService.findOrCreate.mockResolvedValueOnce({ id: 'ins-maria' })
      mockAssetsService.findOrCreate.mockResolvedValueOnce({ id: 'ast-maria' })
      mockPaymentMethodsService.findOrCreate.mockResolvedValueOnce({ id: 'pm-debito' })
      mockPoliciesRepo.create.mockResolvedValueOnce({ id: 'pol-300' })
      mockPolicyAssetsRepo.create.mockResolvedValueOnce({ policyId: 'pol-300', assetId: 'ast-maria' })
      mockPolicyCoveragesRepo.createMany.mockResolvedValueOnce([])
      mockPolicyInstallmentsService.createMany.mockResolvedValueOnce([])

      await (service as any).processAiResult({
        organizationId: 'org-variant',
        aiExtractionResultId: 'ai-res-variant',
        structuredPayload: payload,
      })

      // Company lookup without code should pass name and undefined/empty code
      expect(mockCompaniesService.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'LA SEGUNDA' }),
        expect.anything(),
      )

      // Branch code fallback to 'OTROS' when empty/falsy
      expect(mockBranchesService.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'OTROS' }),
        expect.anything(),
      )

      // Insured should handle empty CUIT by defaulting to 00000000000
      expect(mockInsuredsService.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-variant',
          fullName: 'MARIA LOPEZ',
          cuit: '00000000000',
        }),
        expect.anything(),
      )

      // Policy installments should preserve totalAmount
      expect(mockPolicyInstallmentsService.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ installmentNumber: 1, totalAmount: 25000 }),
          expect.objectContaining({ installmentNumber: 2, totalAmount: 30000 }),
        ]),
        expect.anything(),
      )

      // Policy creation with organizationId
      expect(mockPoliciesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-variant',
        }),
        expect.anything(),
      )
    })

    it('should throw error when organizationId is missing in processAiResult payload', async () => {
      await expect(
        (service as any).processAiResult({
          aiExtractionResultId: 'ai-res-no-org',
          structuredPayload: validExtractedPolicy,
        }),
      ).rejects.toThrow('organizationId required in payload')
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

  describe('processObjectCreateEvent', () => {
    it('should call filesService.generateTemporaryPublicUrl(key, 300) and dispatch documentUrl to aiQueue', async () => {
      const bucket = 'copas-documents'
      const key = 'org-1/uuid-1234-poliza.pdf'
      const eTag = 'etag-abc-999'
      const mockPresignedUrl = 'https://account.r2.cloudflarestorage.com/copas-documents/org-1/uuid-1234-poliza.pdf?X-Amz-Expires=300'
      mockFilesService.generateTemporaryPublicUrl.mockResolvedValueOnce(mockPresignedUrl)

      await (service as any).processObjectCreateEvent(bucket, key, eTag)

      expect(mockFilesService.generateTemporaryPublicUrl).toHaveBeenCalledWith(key, 300)
      expect(mockAiQueue.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ai-extraction',
          payload: expect.objectContaining({
            documentUrl: mockPresignedUrl,
            aiExtractionResultId: 'extraction-res-1',
          }),
          metadata: expect.objectContaining({
            organizationId: 'org-1',
            idempotencyKey: eTag,
          }),
        }),
      )
    })

    it('should fallback organizationId to default and idempotencyKey to key/id when key has no slash and eTag is absent', async () => {
      const bucket = 'copas-documents'
      const key = 'unprefixed-policy.pdf'
      mockFilesService.generateTemporaryPublicUrl.mockResolvedValueOnce('https://temp.url/unprefixed-policy.pdf')

      await (service as any).processObjectCreateEvent(bucket, key)

      expect(mockAiQueue.send).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            organizationId: 'default',
            idempotencyKey: key,
          }),
        }),
      )
    })

    it('should use raw key as documentUrl when filesService is undefined', async () => {
      const serviceWithoutFiles = createPoliciesService({
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
        aiQueue: mockAiQueue,
      })

      await (serviceWithoutFiles as any).processObjectCreateEvent('bucket', 'org-2/file.pdf', 'etag-123')

      expect(mockAiQueue.send).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            documentUrl: 'org-2/file.pdf',
          }),
        }),
      )
    })

    it('should reject if filesService.generateTemporaryPublicUrl fails during processObjectCreateEvent', async () => {
      mockFilesService.generateTemporaryPublicUrl.mockRejectedValueOnce(new Error('Failed to generate temporary public URL'))

      await expect(
        (service as any).processObjectCreateEvent('bucket', 'key.pdf', 'etag'),
      ).rejects.toThrow('Failed to generate temporary public URL')

      expect(mockAiQueue.send).not.toHaveBeenCalled()
    })

    it('should reject if aiQueue.send fails during processObjectCreateEvent', async () => {
      mockFilesService.generateTemporaryPublicUrl.mockResolvedValueOnce('https://temp.url')
      mockAiQueue.send.mockRejectedValueOnce(new Error('aiQueue failure'))

      await expect(
        (service as any).processObjectCreateEvent('bucket', 'key.pdf', 'etag'),
      ).rejects.toThrow('aiQueue failure')
    })
  })

  describe('triggerExtraction', () => {
    it('should call filesService.generateTemporaryPublicUrl and dispatch documentUrl to aiQueue', async () => {
      const documentUrlOrKey = 'org-1/manual-extract.pdf'
      const organizationId = '018f9e2b-0000-7000-8000-000000000001'
      const userId = '018f9e2b-0000-7000-8000-000000000002'
      const mockPresignedUrl = 'https://account.r2.cloudflarestorage.com/copas-documents/manual-extract.pdf?X-Amz-Expires=300'
      mockFilesService.generateTemporaryPublicUrl.mockResolvedValueOnce(mockPresignedUrl)

      const result = await (service as any).triggerExtraction(documentUrlOrKey, organizationId, userId)

      expect(mockFilesService.generateTemporaryPublicUrl).toHaveBeenCalledWith(documentUrlOrKey, 300)
      expect(mockAiQueue.send).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            documentUrl: mockPresignedUrl,
          }),
        }),
      )
      expect(result).toEqual({
        aiExtractionResultId: 'extraction-res-1',
        status: 'pending',
        documentUrl: mockPresignedUrl,
      })
    })

    it('should dispatch directly to aiQueue without presigning when documentUrl starts with http, https, or data:', async () => {
      const httpUrl = 'https://custom-domain.com/docs/policy.pdf'
      const dataUrl = 'data:application/pdf;base64,JVBERi0xLjQK...'

      await (service as any).triggerExtraction(httpUrl, 'org-http')
      expect(mockFilesService.generateTemporaryPublicUrl).not.toHaveBeenCalled()
      expect(mockAiQueue.send).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ documentUrl: httpUrl }),
          metadata: expect.objectContaining({ organizationId: 'org-http' }),
        }),
      )

      await (service as any).triggerExtraction(dataUrl)
      expect(mockAiQueue.send).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ documentUrl: dataUrl }),
          metadata: expect.objectContaining({ organizationId: 'default' }),
        }),
      )
    })

    it('should reject if filesService.generateTemporaryPublicUrl fails during triggerExtraction', async () => {
      mockFilesService.generateTemporaryPublicUrl.mockRejectedValueOnce(new Error('Cannot sign URL'))

      await expect(
        (service as any).triggerExtraction('key.pdf', 'org-1', 'usr-1'),
      ).rejects.toThrow('Cannot sign URL')

      expect(mockAiQueue.send).not.toHaveBeenCalled()
    })
  })

  describe('generateUploadUrl', () => {
    it('should call filesService.generateUploadUrl with default filename document.pdf when filename is omitted', async () => {
      mockFilesService.generateUploadUrl.mockResolvedValueOnce({
        uploadUrl: 'https://r2.example.com/upload-signed',
        policyAssetKey: 'org-10/doc.pdf',
      })

      const res = await (service as any).generateUploadUrl({}, 'org-10')

      expect(mockFilesService.generateUploadUrl).toHaveBeenCalledWith('document.pdf', 'org-10', 300)
      expect(res).toEqual({
        uploadUrl: 'https://r2.example.com/upload-signed',
        policyAssetKey: 'org-10/doc.pdf',
      })
    })

    it('should call filesService.generateUploadUrl with custom filename and default org default', async () => {
      mockFilesService.generateUploadUrl.mockResolvedValueOnce({
        uploadUrl: 'https://r2.example.com/upload-custom',
        policyAssetKey: 'default/custom.pdf',
      })

      const res = await (service as any).generateUploadUrl({ filename: 'custom.pdf' })

      expect(mockFilesService.generateUploadUrl).toHaveBeenCalledWith('custom.pdf', 'default', 300)
      expect(res).toEqual({
        uploadUrl: 'https://r2.example.com/upload-custom',
        policyAssetKey: 'default/custom.pdf',
      })
    })

    it('should fallback to local storage URL format when filesService is not configured', async () => {
      const serviceWithoutFiles = createPoliciesService({
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

      const res = await (serviceWithoutFiles as any).generateUploadUrl({ filename: 'mypolicy.pdf' }, 'org-99')

      expect(res.policyAssetKey).toMatch(/^org-99\/[a-f0-9-]+-mypolicy\.pdf$/)
      expect(res.uploadUrl).toBe(`https://storage.copas.local/${res.policyAssetKey}`)
    })
  })

  describe('getExtractionResult', () => {
    it('should return extraction result when repo.getExtractionResult exists', async () => {
      mockPoliciesRepo.getExtractionResult = vi.fn().mockResolvedValueOnce({
        id: 'ext-999',
        status: 'completed',
        policyId: 'pol-123',
      })

      const res = await (service as any).getExtractionResult('ext-999')

      expect(res).toEqual({
        id: 'ext-999',
        status: 'completed',
        policyId: 'pol-123',
      })
      expect(mockPoliciesRepo.getExtractionResult).toHaveBeenCalledWith('ext-999', undefined)
    })

    it('should return null when repo does not implement getExtractionResult', async () => {
      delete mockPoliciesRepo.getExtractionResult

      const res = await (service as any).getExtractionResult('ext-unimplemented')
      expect(res).toBeNull()
    })
  })
})
