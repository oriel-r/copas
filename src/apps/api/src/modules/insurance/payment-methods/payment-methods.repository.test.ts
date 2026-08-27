import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPaymentMethodsRepository } from './payment-methods.repository'
import type { PaymentMethodInsert } from '@copas/contracts'

describe('payment-methods.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createPaymentMethodsRepository>

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
    }
    repository = createPaymentMethodsRepository({ db: mockDb })
  })

  describe('findById', () => {
    it('should return payment method by id', async () => {
      const pm = { id: 'pm-1', code: 'AUTOMATICO_DEBITO', name: 'Débito Automático' }
      mockDb.limit.mockResolvedValueOnce([pm])

      const result = await repository.findById('pm-1')
      expect(result).toEqual(pm)
    })

    it('should return null if not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findById('pm-999')
      expect(result).toBeNull()
    })
  })

  describe('findByCode', () => {
    it('should return payment method by code', async () => {
      const pm = { id: 'pm-1', code: 'PAGO_MANUAL', name: 'Pago Manual' }
      mockDb.limit.mockResolvedValueOnce([pm])

      const result = await repository.findByCode('PAGO_MANUAL')
      expect(result).toEqual(pm)
    })

    it('should return null if code not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findByCode('UNKNOWN')
      expect(result).toBeNull()
    })

    it('should use transaction tx if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([{ id: 'pm-1', code: 'AUTOMATICO_CREDITO' }]),
      }

      const result = await repository.findByCode('AUTOMATICO_CREDITO', mockTx as any)
      expect(result).toEqual({ id: 'pm-1', code: 'AUTOMATICO_CREDITO' })
      expect(mockTx.select).toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('should insert and return new payment method', async () => {
      const input: PaymentMethodInsert = { code: 'AUTOMATICO_DEBITO', name: 'Débito Automático' }
      const created = { id: 'pm-2', ...input }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await repository.create(input)
      expect(result).toEqual(created)
      expect(mockDb.insert).toHaveBeenCalled()
    })
  })

  describe('list', () => {
    it('should return list of payment methods', async () => {
      const list = [{ id: 'pm-1', code: 'PAGO_MANUAL', name: 'Pago Manual' }]
      mockDb.offset.mockResolvedValueOnce(list)

      const result = await repository.list()
      expect(result).toEqual(list)
    })
  })
})
