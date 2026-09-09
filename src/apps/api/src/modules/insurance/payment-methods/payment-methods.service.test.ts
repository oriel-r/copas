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

  describe('constructor and dependency injection', () => {
    it('should initialize with object argument containing paymentMethodsRepository', () => {
      const s = createPaymentMethodsService({ paymentMethodsRepository: mockRepo })
      expect(s).toBeDefined()
      expect(typeof s.getById).toBe('function')
      expect(typeof s.findByCode).toBe('function')
      expect(typeof s.findOrCreate).toBe('function')
      expect(typeof s.create).toBe('function')
      expect(typeof s.list).toBe('function')
    })

    it('should initialize with positional argument paymentMethodsRepository', () => {
      const s = createPaymentMethodsService(mockRepo as any)
      expect(s).toBeDefined()
      expect(typeof s.getById).toBe('function')
    })
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
      expect(mockRepo.findById).toHaveBeenCalledWith('pm-1', undefined)
    })

    it('should return null when payment method is not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null)

      const result = await service.getById('pm-non-existent')
      expect(result).toBeNull()
      expect(mockRepo.findById).toHaveBeenCalledWith('pm-non-existent', undefined)
    })

    it('should propagate tx to findById', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.findById.mockResolvedValueOnce(null)

      await service.getById('pm-1', mockTx)
      expect(mockRepo.findById).toHaveBeenCalledWith('pm-1', mockTx)
    })
  })

  describe('findByCode', () => {
    it('should return payment method by code', async () => {
      const pm = { id: 'pm-1', code: 'AUTOMATICO_DEBITO', name: 'Débito Automático' }
      mockRepo.findByCode.mockResolvedValueOnce(pm)

      const result = await service.findByCode('AUTOMATICO_DEBITO')
      expect(result).toEqual(pm)
      expect(mockRepo.findByCode).toHaveBeenCalledWith('AUTOMATICO_DEBITO', undefined)
    })

    it('should return null when code is not found', async () => {
      mockRepo.findByCode.mockResolvedValueOnce(null)

      const result = await service.findByCode('NOT_FOUND')
      expect(result).toBeNull()
      expect(mockRepo.findByCode).toHaveBeenCalledWith('NOT_FOUND', undefined)
    })

    it('should propagate tx to findByCode', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.findByCode.mockResolvedValueOnce(null)

      await service.findByCode('CODE_TX', mockTx)
      expect(mockRepo.findByCode).toHaveBeenCalledWith('CODE_TX', mockTx)
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

  describe('create', () => {
    it('should delegate create to repository', async () => {
      const input: PaymentMethodInsert = { code: 'CHEQUE', name: 'Cheque' }
      const created = { id: 'pm-4', ...input }
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.create(input)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input, undefined)
    })

    it('should propagate tx to create', async () => {
      const mockTx = { isTx: true } as any
      const input: PaymentMethodInsert = { code: 'TRANSFER', name: 'Transferencia' }
      mockRepo.create.mockResolvedValueOnce({ id: 'pm-tx', ...input })

      await service.create(input, mockTx)
      expect(mockRepo.create).toHaveBeenCalledWith(input, mockTx)
    })
  })

  describe('list', () => {
    it('should return list from repository and delegate filters', async () => {
      const list = [{ id: 'pm-1', code: 'PAGO_MANUAL', name: 'Pago Manual' }]
      mockRepo.list.mockResolvedValueOnce(list)

      const result = await service.list({ limit: 10 } as any)
      expect(result).toEqual(list)
      expect(mockRepo.list).toHaveBeenCalledWith({ limit: 10 }, undefined)
    })

    it('should handle list with undefined filters and propagate tx', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.list.mockResolvedValueOnce([])

      const result = await service.list(undefined, mockTx)
      expect(result).toEqual([])
      expect(mockRepo.list).toHaveBeenCalledWith(undefined, mockTx)
    })
  })
})

