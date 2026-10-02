import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RemindersRpcEntrypoint } from './reminders-rpc.entrypoint'
import type { ReminderDispatchParams } from '@copas/contracts'

describe('reminders-rpc.entrypoint', () => {
  let mockCtx: any
  let mockEnv: any
  let entrypoint: RemindersRpcEntrypoint

  beforeEach(() => {
    mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    }
    mockEnv = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnThis(),
          all: vi.fn().mockResolvedValue({ results: [] }),
          raw: vi.fn().mockResolvedValue([]),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      },
      WHATSAPP_QUEUE: {
        send: vi.fn().mockResolvedValue(undefined),
      },
    }
    entrypoint = new RemindersRpcEntrypoint(mockCtx, mockEnv)
  })

  describe('dispatchDueReminders', () => {
    it('should accept valid scheduledDate in YYYY-MM-DD format and execute dispatch', async () => {
      const validParams: ReminderDispatchParams = {
        scheduledDate: '2026-09-10',
      }

      const result = await entrypoint.dispatchDueReminders(validParams)
      expect(result).toBeDefined()
      expect(result.scheduledDate).toBe('2026-09-10')
      expect(typeof result.totalEvaluated).toBe('number')
      expect(typeof result.totalEnqueued).toBe('number')
      expect(typeof result.totalSkipped).toBe('number')
      expect(typeof result.totalAlreadySent).toBe('number')
      expect(Array.isArray(result.errors)).toBe(true)
    })

    it.each([
      { scheduledDate: '2026/09/10', desc: 'slash separator format' },
      { scheduledDate: '10-09-2026', desc: 'DD-MM-YYYY format' },
      { scheduledDate: 'invalid-date', desc: 'arbitrary string' },
      { scheduledDate: '', desc: 'empty string' },
      { scheduledDate: '   ', desc: 'whitespace string' },
      { scheduledDate: '2026-9-10', desc: 'single digit month' },
      { scheduledDate: '2026-09-1', desc: 'single digit day' },
    ])('should reject invalid scheduledDate ($desc)', async ({ scheduledDate }) => {
      await expect(
        entrypoint.dispatchDueReminders({ scheduledDate } as any),
      ).rejects.toThrow('invalid date format, must be YYYY-MM-DD')
    })

    it('should reject when params object is missing scheduledDate', async () => {
      await expect(
        entrypoint.dispatchDueReminders({} as any),
      ).rejects.toThrow('invalid date format, must be YYYY-MM-DD')
    })

    it('should reject when params is undefined or null', async () => {
      await expect(
        entrypoint.dispatchDueReminders(undefined as any),
      ).rejects.toThrow()
      await expect(
        entrypoint.dispatchDueReminders(null as any),
      ).rejects.toThrow()
    })

    it('should execute dispatch with organization results from DB', async () => {
      mockEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({
          results: [{ id: 'org-1' }],
        }),
        raw: vi.fn().mockResolvedValue([['org-1']]),
        run: vi.fn().mockResolvedValue({ success: true }),
      })

      const result = await entrypoint.dispatchDueReminders({ scheduledDate: '2026-09-10' })
      expect(result).toBeDefined()
      expect(result.scheduledDate).toBe('2026-09-10')
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
    })
  })
})
