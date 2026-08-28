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
    }
    service = createPolicyInstallmentsService({ policyInstallmentsRepository: mockRepo })
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
})

