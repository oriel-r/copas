import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createConsentsRepository } from './consents.repository'

const { mockDrizzle } = vi.hoisted(() => ({
  mockDrizzle: vi.fn((d1: any) => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    _drizzleWrapped: true,
    _rawD1: d1,
  })),
}))

vi.mock('drizzle-orm/d1', () => ({
  drizzle: mockDrizzle,
}))

describe('consents.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createConsentsRepository>

  beforeEach(() => {
    mockDrizzle.mockClear()
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
    }
    repository = createConsentsRepository({ db: mockDb } as any)
  })

  describe('D1 vs Drizzle wrapping', () => {
    it('should wrap D1 database with drizzle lazily when db.prepare is a function', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createConsentsRepository({ db: mockD1 } as any)
      await repo.isOptedOut('ins-1', 'payment_reminder')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap D1 database with drizzle lazily when passed positionally', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createConsentsRepository(mockD1 as any)
      await repo.isOptedOut('ins-1', 'payment_reminder')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap tx with drizzle if tx has prepare function', async () => {
      const mockTx = { prepare: vi.fn() }
      await repository.isOptedOut('ins-1', 'payment_reminder', mockTx as any)
      expect(mockDrizzle).toHaveBeenCalledWith(mockTx)
    })
  })

  describe('isOptedOut', () => {
    it('should return true when active opt_out consent is found for insured and category on whatsapp channel', async () => {
      mockDb.where.mockResolvedValueOnce([{ isOptedOut: true }])

      const result = await repository.isOptedOut('ins-123', 'payment_reminder')

      expect(result).toBe(true)
      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should return false when consent record has isOptedOut: false', async () => {
      mockDb.where.mockResolvedValueOnce([{ isOptedOut: false }])

      const result = await repository.isOptedOut('ins-123', 'payment_reminder')

      expect(result).toBe(false)
      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should return false when no consent record is found', async () => {
      mockDb.where.mockResolvedValueOnce([])

      const result = await repository.isOptedOut('ins-123', 'payment_reminder')

      expect(result).toBe(false)
      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should use transaction tx if provided', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce([{ isOptedOut: true }]),
      }

      const result = await repository.isOptedOut('ins-123', 'payment_reminder', mockTx as any)

      expect(result).toBe(true)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })
})
