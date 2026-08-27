import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPolicyInstallmentsRepository } from './policy-installments.repository'
import type { PolicyInstallmentInsert } from '@copas/contracts'

describe('policy-installments.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createPolicyInstallmentsRepository>

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }
    repository = createPolicyInstallmentsRepository({ db: mockDb })
  })

  describe('findByPolicyId', () => {
    it('should return all installments for policy ordered', async () => {
      const installments = [
        { id: 'inst-1', policyId: 'pol-1', installmentNumber: 1, dueDate: '2026-01-10', totalAmount: 15000, status: 'pending' },
        { id: 'inst-2', policyId: 'pol-1', installmentNumber: 2, dueDate: '2026-02-10', totalAmount: 15000, status: 'pending' },
      ]
      mockDb.orderBy.mockResolvedValueOnce(installments)

      const result = await repository.findByPolicyId('pol-1')
      expect(result).toEqual(installments)
    })

    it('should use transaction tx if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValueOnce([{ id: 'inst-1', policyId: 'pol-1' }]),
      }

      const result = await repository.findByPolicyId('pol-1', mockTx as any)
      expect(result).toEqual([{ id: 'inst-1', policyId: 'pol-1' }])
      expect(mockTx.select).toHaveBeenCalled()
    })
  })

  describe('findById', () => {
    it('should return installment by id', async () => {
      const installment = { id: 'inst-1', policyId: 'pol-1', installmentNumber: 1 }
      mockDb.limit.mockResolvedValueOnce([installment])

      const result = await repository.findById('inst-1')
      expect(result).toEqual(installment)
    })
  })

  describe('create', () => {
    it('should insert and return installment', async () => {
      const input: PolicyInstallmentInsert = {
        organizationId: 'org-1',
        policyId: 'pol-1',
        uploadedBy: 'usr-1',
        installmentNumber: 1,
        dueDate: '2026-01-10',
        totalAmount: 15000,
        currency: 'ARS',
      }
      const created = { id: 'inst-1', ...input }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.create(input)
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
    })
  })

  describe('createMany', () => {
    it('should insert multiple installments', async () => {
      const inputs: PolicyInstallmentInsert[] = [
        { organizationId: 'org-1', policyId: 'pol-1', uploadedBy: 'usr-1', installmentNumber: 1, dueDate: '2026-01-10', totalAmount: 15000, currency: 'ARS' },
        { organizationId: 'org-1', policyId: 'pol-1', uploadedBy: 'usr-1', installmentNumber: 2, dueDate: '2026-02-10', totalAmount: 15000, currency: 'ARS' },
      ]
      const created = [
        { id: 'inst-1', ...inputs[0] },
        { id: 'inst-2', ...inputs[1] },
      ]
      mockDb.returning.mockResolvedValueOnce(created)

      const result = await repository.createMany(inputs)
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should propagate transaction tx', async () => {
      const inputs = [{ organizationId: 'org-1', policyId: 'pol-1', uploadedBy: 'usr-1', installmentNumber: 1, dueDate: '2026-01-10', totalAmount: 15000, currency: 'ARS' }]
      const created = [{ id: 'inst-1', ...inputs[0] }]
      const mockTx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce(created),
      }

      const result = await repository.createMany(inputs, mockTx as any)
      expect(result).toEqual(created)
      expect(mockTx.insert).toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update installment status', async () => {
      const updated = { id: 'inst-1', status: 'paid' }
      mockDb.returning.mockResolvedValueOnce([updated])

      const result = await repository.update('inst-1', { status: 'paid' })
      expect(result).toEqual(updated)
    })
  })
})
