import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPaymentMethodsService } from './payment-methods.service'
import type { PaymentMethod, PaymentMethodInsert } from '@copas/contracts'

describe('payment-methods.service', () => {
  let mockRepo: any
  let service: ReturnType<typeof createPaymentMethodsService>

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByCode: vi.fn(),
      create: vi.fn(),
      list: vi.fn(),
    }
    service = createPaymentMethodsService({ paymentMethodsRepository: mockRepo })
  })

  describe('getById', () => {
    it('should return payment method when found', async () => {
      const pm: PaymentMethod = {
        id: 'pm-1',
        code: 'PAGO_MANUAL',
        name: 'Pago Manual',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockRepo.findById.mockResolvedValueOnce(pm)

      const result = await service.getById('pm-1')
      expect(result).toEqual(pm)
    })
  })

  describe('findByCode', () => {
    it('should return payment method by code', async () => {
      const pm = { id: 'pm-1', code: 'AUTOMATICO_DEBITO', name: 'Débito Automático' }
      mockRepo.findByCode.mockResolvedValueOnce(pm)

      const result = await service.findByCode('AUTOMATICO_DEBITO')
      expect(result).toEqual(pm)
    })
  })

  describe('findOrCreate', () => {
    it('should return existing payment method if code exists', async () => {
      const existing = { id: 'pm-1', code: 'AUTOMATICO_CREDITO', name: 'Tarjeta de Crédito' }
      mockRepo.findByCode.mockResolvedValueOnce(existing)

      const result = await service.findOrCreate({ code: 'AUTOMATICO_CREDITO', name: 'Tarjeta de Crédito' })
      expect(result).toEqual(existing)
      expect(mockRepo.create).not.toHaveBeenCalled()
    })

    it('should create new payment method if not found', async () => {
      const input: PaymentMethodInsert = { code: 'PAGO_MANUAL', name: 'Pago Manual' }
      const created = { id: 'pm-2', ...input }
      mockRepo.findByCode.mockResolvedValueOnce(null)
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.findOrCreate(input)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input, undefined)
    })

    it('should propagate transaction tx', async () => {
      const mockTx = {} as any
      const input = { code: 'AUTOMATICO_DEBITO', name: 'Débito' }
      mockRepo.findByCode.mockResolvedValueOnce(null)
      mockRepo.create.mockResolvedValueOnce({ id: 'pm-3', ...input })

      await service.findOrCreate(input, mockTx)
      expect(mockRepo.findByCode).toHaveBeenCalledWith('AUTOMATICO_DEBITO', mockTx)
      expect(mockRepo.create).toHaveBeenCalledWith(input, mockTx)
    })
  })

  describe('list', () => {
    it('should return list from repository', async () => {
      const list = [{ id: 'pm-1', code: 'PAGO_MANUAL', name: 'Pago Manual' }]
      mockRepo.list.mockResolvedValueOnce(list)

      const result = await service.list()
      expect(result).toEqual(list)
    })
  })
})
