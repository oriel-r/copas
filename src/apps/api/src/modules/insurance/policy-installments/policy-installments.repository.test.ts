import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPolicyInstallmentsRepository } from './policy-installments.repository'
import type { PolicyInstallmentInsert } from '@copas/contracts'

const { mockDrizzle } = vi.hoisted(() => ({
  mockDrizzle: vi.fn((d1: any) => ({
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
    _drizzleWrapped: true,
    _rawD1: d1,
  })),
}))

vi.mock('drizzle-orm/d1', () => ({
  drizzle: mockDrizzle,
}))

describe('policy-installments.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createPolicyInstallmentsRepository>

  beforeEach(() => {
    mockDrizzle.mockClear()
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

  describe('D1 vs Drizzle wrapping', () => {
    it('should wrap D1 database with drizzle lazily when db.prepare is a function', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createPolicyInstallmentsRepository({ db: mockD1 as any })
      await repo.findById('inst-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap D1 database with drizzle lazily when passed positionally', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createPolicyInstallmentsRepository(mockD1 as any)
      await repo.findById('inst-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap tx with drizzle if tx has prepare function', async () => {
      const mockTx = { prepare: vi.fn() }
      await repository.findById('inst-1', mockTx as any)
      expect(mockDrizzle).toHaveBeenCalledWith(mockTx)
    })
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
      expect(mockDb.where).toHaveBeenCalled()
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
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('findById', () => {
    it('should return installment by id', async () => {
      const installment = { id: 'inst-1', policyId: 'pol-1', installmentNumber: 1 }
      mockDb.limit.mockResolvedValueOnce([installment])

      const result = await repository.findById('inst-1')
      expect(result).toEqual(installment)
    })

    it('should return null if installment not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findById('inst-missing')
      expect(result).toBeNull()
    })

    it('should use transaction tx in findById if provided', async () => {
      const installment = { id: 'inst-1', policyId: 'pol-1', installmentNumber: 1 }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([installment]),
      }

      const result = await repository.findById('inst-1', mockTx as any)
      expect(result).toEqual(installment)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
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

    it('should use transaction tx in create if provided', async () => {
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
      const mockTx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([created]),
      }

      const result = await repository.create(input, mockTx as any)
      expect(result).toEqual(created)
      expect(mockTx.insert).toHaveBeenCalled()
      expect(mockDb.insert).not.toHaveBeenCalled()
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
      expect(mockDb.insert).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update installment status', async () => {
      const updated = { id: 'inst-1', status: 'paid' }
      mockDb.returning.mockResolvedValueOnce([updated])

      const result = await repository.update('inst-1', { status: 'paid' })
      expect(result).toEqual(updated)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should use transaction tx in update if provided', async () => {
      const updated = { id: 'inst-1', status: 'paid' }
      const mockTx = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([updated]),
      }

      const result = await repository.update('inst-1', { status: 'paid' }, mockTx as any)
      expect(result).toEqual(updated)
      expect(mockTx.update).toHaveBeenCalled()
      expect(mockDb.update).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete installment by id', async () => {
      mockDb.where.mockResolvedValueOnce({ rowCount: 1 })

      await repository.delete('inst-1')
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should use transaction tx in delete if provided', async () => {
      const mockTx = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce({ rowCount: 1 }),
      }

      await repository.delete('inst-1', mockTx as any)
      expect(mockTx.delete).toHaveBeenCalled()
      expect(mockDb.delete).not.toHaveBeenCalled()
    })
  })

  describe('list', () => {
    it('should return list of installments with default limit and offset', async () => {
      const list = [{ id: 'inst-1' }]
      mockDb.offset.mockResolvedValueOnce(list)

      const result = await repository.list({ organizationId: 'org-1' })
      expect(result).toEqual(list)
      expect(mockDb.limit).toHaveBeenCalledWith(50)
      expect(mockDb.offset).toHaveBeenCalledWith(0)
    })

    it('should use custom limit and offset if provided', async () => {
      mockDb.offset.mockResolvedValueOnce([])

      await repository.list({ organizationId: 'org-1', limit: 15, offset: 30 })
      expect(mockDb.limit).toHaveBeenCalledWith(15)
      expect(mockDb.offset).toHaveBeenCalledWith(30)
    })

    it('should filter by policyId if provided', async () => {
      mockDb.offset.mockResolvedValueOnce([])

      await repository.list({ organizationId: 'org-1', policyId: 'pol-1' })
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should filter by status if provided', async () => {
      mockDb.offset.mockResolvedValueOnce([])

      await repository.list({ organizationId: 'org-1', status: 'pending' as any })
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should use transaction tx in list if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValueOnce([]),
      }

      await repository.list({ organizationId: 'org-1' }, mockTx as any)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })
})

