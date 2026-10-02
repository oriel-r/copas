import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPaymentMethodsRepository } from './payment-methods.repository'
import type { PaymentMethodInsert } from '@copas/contracts'

const { mockDrizzle } = vi.hoisted(() => ({
  mockDrizzle: vi.fn((d1: any) => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
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

describe('payment-methods.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createPaymentMethodsRepository>

  beforeEach(() => {
    mockDrizzle.mockClear()
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

  describe('D1 vs Drizzle wrapping', () => {
    it('should wrap D1 database with drizzle lazily when db.prepare is a function', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createPaymentMethodsRepository({ db: mockD1 as any })
      await repo.findById('pm-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap D1 database with drizzle lazily when passed positionally', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createPaymentMethodsRepository(mockD1 as any)
      await repo.findById('pm-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap tx with drizzle if tx has prepare function', async () => {
      const mockTx = { prepare: vi.fn() }
      await repository.findById('pm-1', mockTx as any)
      expect(mockDrizzle).toHaveBeenCalledWith(mockTx)
    })
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

      const result = await repository.findById('pm-missing')
      expect(result).toBeNull()
    })

    it('should use transaction tx in findById if provided', async () => {
      const pm = { id: 'pm-1', code: 'PAGO_MANUAL' }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([pm]),
      }

      const result = await repository.findById('pm-1', mockTx as any)
      expect(result).toEqual(pm)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
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
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('findByName', () => {
    it('should return payment method by name', async () => {
      const pm = { id: 'pm-1', code: 'PAGO_MANUAL', name: 'Pago Manual' }
      mockDb.limit.mockResolvedValueOnce([pm])

      const result = await repository.findByName('Pago Manual')
      expect(result).toEqual(pm)
    })

    it('should return null if name not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findByName('Desconocido')
      expect(result).toBeNull()
    })

    it('should use transaction tx in findByName if provided', async () => {
      const pm = { id: 'pm-1', name: 'Pago Efectivo' }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([pm]),
      }

      const result = await repository.findByName('Pago Efectivo', mockTx as any)
      expect(result).toEqual(pm)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
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

    it('should use transaction tx in create if provided', async () => {
      const input: PaymentMethodInsert = { code: 'CHEQUE', name: 'Cheque' }
      const created = { id: 'pm-3', ...input }
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

  describe('list', () => {
    it('should return list of payment methods with default limit and offset', async () => {
      const list = [{ id: 'pm-1', code: 'PAGO_MANUAL', name: 'Pago Manual' }]
      mockDb.offset.mockResolvedValueOnce(list)

      const result = await repository.list({})
      expect(result).toEqual(list)
      expect(mockDb.limit).toHaveBeenCalledWith(50)
      expect(mockDb.offset).toHaveBeenCalledWith(0)
    })

    it('should use custom limit and offset if provided', async () => {
      mockDb.offset.mockResolvedValueOnce([])

      await repository.list({ limit: 10, offset: 20 })
      expect(mockDb.limit).toHaveBeenCalledWith(10)
      expect(mockDb.offset).toHaveBeenCalledWith(20)
    })

    it('should use transaction tx in list if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValueOnce([]),
      }

      await repository.list({}, mockTx as any)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })
})


