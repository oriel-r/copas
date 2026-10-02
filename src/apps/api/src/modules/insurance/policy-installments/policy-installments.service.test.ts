import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPolicyInstallmentsService } from './policy-installments.service'
import type { PolicyInstallment, PolicyInstallmentInsert } from '@copas/contracts'

describe('policy-installments.service', () => {
  let mockRepo: any
  let service: ReturnType<typeof createPolicyInstallmentsService>

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByPolicyId: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      findWithDetails: vi.fn(),
    }
    service = createPolicyInstallmentsService({ policyInstallmentsRepository: mockRepo })
  })

  describe('initialization / DI', () => {
    it('should support options object dependency injection', async () => {
      const svc = createPolicyInstallmentsService({ policyInstallmentsRepository: mockRepo })
      mockRepo.findById.mockResolvedValueOnce({ id: 'inst-1' })
      const res = await svc.getById('inst-1')
      expect(res).toEqual({ id: 'inst-1' })
    })

    it('should support positional repository dependency injection', async () => {
      const svc = createPolicyInstallmentsService(mockRepo as any)
      mockRepo.findById.mockResolvedValueOnce({ id: 'inst-1' })
      const res = await svc.getById('inst-1')
      expect(res).toEqual({ id: 'inst-1' })
    })
  })

  describe('getByPolicyId', () => {
    it('should return installments for policy', async () => {
      const installments: PolicyInstallment[] = [
        {
          id: 'inst-1',
          organizationId: 'org-1',
          policyId: 'pol-1',
          uploadedBy: 'usr-1',
          installmentNumber: 1,
          dueDate: '2026-01-10',
          totalAmount: 15000,
          currency: 'ARS',
          status: 'pending',
          receiptUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ]
      mockRepo.findByPolicyId.mockResolvedValueOnce(installments)

      const result = await service.getByPolicyId('pol-1')
      expect(result).toEqual(installments)
      expect(mockRepo.findByPolicyId).toHaveBeenCalledWith('pol-1', undefined)
    })

    it('should return empty array when no installments found', async () => {
      mockRepo.findByPolicyId.mockResolvedValueOnce([])
      const result = await service.getByPolicyId('pol-empty')
      expect(result).toEqual([])
      expect(mockRepo.findByPolicyId).toHaveBeenCalledWith('pol-empty', undefined)
    })

    it('should propagate tx in getByPolicyId', async () => {
      const mockTx = {} as any
      mockRepo.findByPolicyId.mockResolvedValueOnce([])
      const result = await service.getByPolicyId('pol-1', mockTx)
      expect(result).toEqual([])
      expect(mockRepo.findByPolicyId).toHaveBeenCalledWith('pol-1', mockTx)
    })
  })

  describe('createMany', () => {
    it('should delegate batch installment creation to repository', async () => {
      const inputs: PolicyInstallmentInsert[] = [
        { organizationId: 'org-1', policyId: 'pol-1', uploadedBy: 'usr-1', installmentNumber: 1, dueDate: '2026-01-10', totalAmount: 15000, currency: 'ARS' },
        { organizationId: 'org-1', policyId: 'pol-1', uploadedBy: 'usr-1', installmentNumber: 2, dueDate: '2026-02-10', totalAmount: 15000, currency: 'ARS' },
      ]
      const created = [
        { id: 'inst-1', ...inputs[0] },
        { id: 'inst-2', ...inputs[1] },
      ]
      mockRepo.createMany.mockResolvedValueOnce(created)

      const result = await service.createMany(inputs)
      expect(result).toEqual(created)
      expect(mockRepo.createMany).toHaveBeenCalledWith(inputs, undefined)
    })

    it('should propagate transaction tx', async () => {
      const mockTx = {} as any
      const inputs: PolicyInstallmentInsert[] = [
        { organizationId: 'org-1', policyId: 'pol-1', uploadedBy: 'usr-1', installmentNumber: 1, dueDate: '2026-01-10', totalAmount: 15000, currency: 'ARS' },
      ]
      mockRepo.createMany.mockResolvedValueOnce([{ id: 'inst-1', ...inputs[0] }])

      await service.createMany(inputs, mockTx)
      expect(mockRepo.createMany).toHaveBeenCalledWith(inputs, mockTx)
    })
  })

  describe('getById', () => {
    it('should return installment by id', async () => {
      const inst = { id: 'inst-1', installmentNumber: 1 }
      mockRepo.findById.mockResolvedValueOnce(inst)

      const result = await service.getById('inst-1')
      expect(result).toEqual(inst)
      expect(mockRepo.findById).toHaveBeenCalledWith('inst-1', undefined)
    })

    it('should return null when installment not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null)
      const result = await service.getById('non-existent')
      expect(result).toBeNull()
      expect(mockRepo.findById).toHaveBeenCalledWith('non-existent', undefined)
    })

    it('should propagate tx in getById', async () => {
      const mockTx = {} as any
      const inst = { id: 'inst-1', installmentNumber: 1 }
      mockRepo.findById.mockResolvedValueOnce(inst)

      const result = await service.getById('inst-1', mockTx)
      expect(result).toEqual(inst)
      expect(mockRepo.findById).toHaveBeenCalledWith('inst-1', mockTx)
    })
  })

  describe('create', () => {
    it('should delegate single installment creation to repository', async () => {
      const input: PolicyInstallmentInsert = { organizationId: 'org-1', policyId: 'pol-1', uploadedBy: 'usr-1', installmentNumber: 1, dueDate: '2026-01-10', totalAmount: 15000, currency: 'ARS' }
      const created = { id: 'inst-1', ...input }
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.create(input)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input, undefined)
    })

    it('should propagate tx in create', async () => {
      const mockTx = {} as any
      const input: PolicyInstallmentInsert = { organizationId: 'org-1', policyId: 'pol-1', uploadedBy: 'usr-1', installmentNumber: 1, dueDate: '2026-01-10', totalAmount: 15000, currency: 'ARS' }
      const created = { id: 'inst-1', ...input }
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.create(input, mockTx)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input, mockTx)
    })
  })

  describe('updateStatus', () => {
    it('should update installment status to paid', async () => {
      const updated = { id: 'inst-1', status: 'paid' }
      mockRepo.update.mockResolvedValueOnce(updated)

      const result = await service.updateStatus('inst-1', 'paid')
      expect(result).toEqual(updated)
      expect(mockRepo.update).toHaveBeenCalledWith('inst-1', { status: 'paid' }, undefined)
    })

    it('should propagate tx in updateStatus', async () => {
      const mockTx = {} as any
      const updated = { id: 'inst-1', status: 'cancelled' }
      mockRepo.update.mockResolvedValueOnce(updated)

      await service.updateStatus('inst-1', 'cancelled', mockTx)
      expect(mockRepo.update).toHaveBeenCalledWith('inst-1', { status: 'cancelled' }, mockTx)
    })
  })

  describe('listInstallments', () => {
    it('should default dueDate to today and status to pending when not provided', async () => {
      const todayStr = new Date().toISOString().slice(0, 10)
      mockRepo.findWithDetails.mockResolvedValueOnce([])

      const result = await (service as any).listInstallments({
        organizationId: '018f9e2b-0000-7000-8000-000000000001',
      })

      expect(mockRepo.findWithDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: '018f9e2b-0000-7000-8000-000000000001',
          dueDate: todayStr,
          status: 'pending',
        }),
        undefined,
      )
      expect(result).toMatchObject({
        appliedFilters: {
          dueDate: todayStr,
          status: 'pending',
        },
        total: 0,
        items: [],
      })
    })

    it('should preserve explicit filters (dueDate, status, companyId, insuredId)', async () => {
      const filters = {
        organizationId: '018f9e2b-0000-7000-8000-000000000001',
        dueDate: '2026-10-01',
        status: 'paid',
        companyId: '018f9e2b-2222-7000-8000-000000000002',
        insuredId: '018f9e2b-3333-7000-8000-000000000003',
      }
      mockRepo.findWithDetails.mockResolvedValueOnce([])

      const result = await (service as any).listInstallments(filters)

      expect(mockRepo.findWithDetails).toHaveBeenCalledWith(
        expect.objectContaining(filters),
        undefined,
      )
      expect(result.appliedFilters).toEqual({
        dueDate: '2026-10-01',
        status: 'paid',
        companyId: '018f9e2b-2222-7000-8000-000000000002',
        insuredId: '018f9e2b-3333-7000-8000-000000000003',
      })
    })

    it('should map repository rows to InstallmentDetailedItem using formatAssetDescription', async () => {
      const mockRawRows = [
        {
          installmentId: '018f9e2b-1111-7000-8000-000000000001',
          policyId: '018f9e2b-2222-7000-8000-000000000002',
          policyNumber: 'POL-AUTO-01',
          installmentNumber: 2,
          insuredName: 'MARIA LOPEZ',
          companyName: 'LA SEGUNDA',
          properties: { marca: 'FORD', modelo: 'KA', patente: 'AB456CD', anio: 2021 },
          assetTypeName: 'Automotor',
          assetTypeCode: 'AUTO',
          totalAmount: 35000,
          currency: 'ARS',
          dueDate: '2026-09-15',
          status: 'pending',
        },
        {
          installmentId: '018f9e2b-5555-7000-8000-000000000005',
          policyId: '018f9e2b-6666-7000-8000-000000000006',
          policyNumber: 'POL-PROP-02',
          installmentNumber: 1,
          insuredName: 'CARLOS GOMEZ',
          companyName: 'FEDERACION PATRONAL',
          properties: { direccion: 'Av. Corrientes 1234' },
          assetTypeName: 'Hogar',
          assetTypeCode: 'HOGAR',
          totalAmount: 60000,
          currency: 'ARS',
          dueDate: '2026-09-15',
          status: 'pending',
        },
      ]

      mockRepo.findWithDetails.mockResolvedValueOnce(mockRawRows)

      const result = await (service as any).listInstallments({
        organizationId: '018f9e2b-0000-7000-8000-000000000001',
      })

      expect(result.total).toBe(2)
      expect(result.items).toHaveLength(2)
      expect(result.items[0]).toEqual({
        installmentId: '018f9e2b-1111-7000-8000-000000000001',
        policyId: '018f9e2b-2222-7000-8000-000000000002',
        policyNumber: 'POL-AUTO-01',
        installmentNumber: 2,
        insuredName: 'MARIA LOPEZ',
        companyName: 'LA SEGUNDA',
        assetDescription: 'FORD KA (AB456CD) 2021',
        totalAmount: 35000,
        currency: 'ARS',
        dueDate: '2026-09-15',
        status: 'pending',
      })
      expect(result.items[1].assetDescription).toBe('Av. Corrientes 1234')
    })

    it('should propagate tx in listInstallments', async () => {
      const mockTx = {} as any
      mockRepo.findWithDetails.mockResolvedValueOnce([])

      await (service as any).listInstallments(
        { organizationId: '018f9e2b-0000-7000-8000-000000000001' },
        mockTx,
      )

      expect(mockRepo.findWithDetails).toHaveBeenCalledWith(
        expect.anything(),
        mockTx,
      )
    })
  })

  describe('markAsPaid', () => {
    it('should update installment status to paid', async () => {
      const updated = {
        id: '018f9e2b-1111-7000-8000-000000000001',
        status: 'paid',
      }
      mockRepo.update.mockResolvedValueOnce(updated)

      const result = await (service as any).markAsPaid('018f9e2b-1111-7000-8000-000000000001')

      expect(result).toEqual(updated)
      expect(mockRepo.update).toHaveBeenCalledWith(
        '018f9e2b-1111-7000-8000-000000000001',
        { status: 'paid' },
        undefined,
      )
    })

    it('should propagate tx in markAsPaid', async () => {
      const mockTx = {} as any
      const updated = {
        id: '018f9e2b-1111-7000-8000-000000000001',
        status: 'paid',
      }
      mockRepo.update.mockResolvedValueOnce(updated)

      const result = await (service as any).markAsPaid(
        '018f9e2b-1111-7000-8000-000000000001',
        mockTx,
      )

      expect(result).toEqual(updated)
      expect(mockRepo.update).toHaveBeenCalledWith(
        '018f9e2b-1111-7000-8000-000000000001',
        { status: 'paid' },
        mockTx,
      )
    })
  })
})


