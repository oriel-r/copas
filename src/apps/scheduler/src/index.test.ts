import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import app, { getTodayArgentina } from './index'
import type { ReminderDispatchSummary } from '@copas/contracts'

describe('scheduler worker', () => {
  let mockApi: any
  let mockEnv: any
  let mockCtx: any

  beforeEach(() => {
    mockApi = {
      dispatchDueReminders: vi.fn(),
    }
    mockEnv = {
      API: mockApi,
    }
    mockCtx = {
      waitUntil: vi.fn((promise) => promise),
      passThroughOnException: vi.fn(),
    }
  })

  describe('scheduled handler', () => {
    it('should derive Argentina civil date (America/Argentina/Buenos_Aires) and call env.API.dispatchDueReminders', async () => {
      // 11:00 UTC = 08:00 ART (UTC-3)
      const scheduledTime = new Date('2026-09-10T11:00:00.000Z').getTime()
      const event = {
        cron: '0 11 * * 1-5',
        scheduledTime,
        type: 'scheduled',
      }

      const mockSummary: ReminderDispatchSummary = {
        scheduledDate: '2026-09-10',
        totalEvaluated: 10,
        totalEnqueued: 8,
        totalSkipped: 2,
        totalAlreadySent: 0,
        errors: [],
      }
      mockApi.dispatchDueReminders.mockResolvedValueOnce(mockSummary)

      await app.scheduled(event as any, mockEnv, mockCtx)

      expect(mockApi.dispatchDueReminders).toHaveBeenCalledWith({
        scheduledDate: '2026-09-10',
      })
    })

    it('should correctly handle timezone boundary when UTC is ahead of ART civil date', async () => {
      // 02:00 UTC on Sept 11 = 23:00 ART on Sept 10 (UTC-3)
      const scheduledTime = new Date('2026-09-11T02:00:00.000Z').getTime()
      const event = {
        cron: '0 2 * * *',
        scheduledTime,
        type: 'scheduled',
      }

      const mockSummary: ReminderDispatchSummary = {
        scheduledDate: '2026-09-10',
        totalEvaluated: 0,
        totalEnqueued: 0,
        totalSkipped: 0,
        totalAlreadySent: 0,
        errors: [],
      }
      mockApi.dispatchDueReminders.mockResolvedValueOnce(mockSummary)

      await app.scheduled(event as any, mockEnv, mockCtx)

      expect(mockApi.dispatchDueReminders).toHaveBeenCalledWith({
        scheduledDate: '2026-09-10',
      })
    })

    it('should pass async work to ctx.waitUntil if ctx is provided', async () => {
      const scheduledTime = new Date('2026-09-10T11:00:00.000Z').getTime()
      const event = {
        cron: '0 11 * * 1-5',
        scheduledTime,
        type: 'scheduled',
      }

      mockApi.dispatchDueReminders.mockResolvedValueOnce({
        scheduledDate: '2026-09-10',
        totalEvaluated: 1,
        totalEnqueued: 1,
        totalSkipped: 0,
        totalAlreadySent: 0,
        errors: [],
      })

      await app.scheduled(event as any, mockEnv, mockCtx)

      expect(mockApi.dispatchDueReminders).toHaveBeenCalled()
      expect(mockCtx.waitUntil).toHaveBeenCalled()
    })

    it('should execute successfully when ctx is undefined (without throwing)', async () => {
      const scheduledTime = new Date('2026-09-10T11:00:00.000Z').getTime()
      const event = {
        cron: '0 11 * * 1-5',
        scheduledTime,
        type: 'scheduled',
      }

      mockApi.dispatchDueReminders.mockResolvedValueOnce({
        scheduledDate: '2026-09-10',
        totalEvaluated: 1,
        totalEnqueued: 1,
        totalSkipped: 0,
        totalAlreadySent: 0,
        errors: [],
      })

      await expect(
        app.scheduled(event as any, mockEnv, undefined as any),
      ).resolves.not.toThrow()

      expect(mockApi.dispatchDueReminders).toHaveBeenCalledWith({
        scheduledDate: '2026-09-10',
      })
    })

    it('should execute successfully when ctx is empty object (no waitUntil)', async () => {
      const scheduledTime = new Date('2026-09-10T11:00:00.000Z').getTime()
      const event = {
        cron: '0 11 * * 1-5',
        scheduledTime,
        type: 'scheduled',
      }

      mockApi.dispatchDueReminders.mockResolvedValueOnce({
        scheduledDate: '2026-09-10',
        totalEvaluated: 1,
        totalEnqueued: 1,
        totalSkipped: 0,
        totalAlreadySent: 0,
        errors: [],
      })

      await expect(
        app.scheduled(event as any, mockEnv, {} as any),
      ).resolves.not.toThrow()

      expect(mockApi.dispatchDueReminders).toHaveBeenCalledWith({
        scheduledDate: '2026-09-10',
      })
    })

    it('should correctly format Argentina date across midnight boundaries (01:00 UTC = 22:00 previous day ART)', async () => {
      // At 01:00 UTC on 10 Sept, in Argentina (UTC-3) it is 22:00 on 9 Sept
      const scheduledTime = new Date('2026-09-10T01:00:00.000Z').getTime()
      const event = {
        cron: '0 1 * * *',
        scheduledTime,
        type: 'scheduled',
      }

      mockApi.dispatchDueReminders.mockResolvedValueOnce({
        scheduledDate: '2026-09-09',
        totalEvaluated: 0,
        totalEnqueued: 0,
        totalSkipped: 0,
        totalAlreadySent: 0,
        errors: [],
      })

      await app.scheduled(event as any, mockEnv, mockCtx)

      expect(mockApi.dispatchDueReminders).toHaveBeenCalledWith({
        scheduledDate: '2026-09-09',
      })
    })

    it('should correctly format Argentina date at 03:00 UTC (exact midnight in ART)', async () => {
      // 03:00 UTC on 10 Sept = 00:00 ART on 10 Sept
      const scheduledTime = new Date('2026-09-10T03:00:00.000Z').getTime()
      const event = {
        cron: '0 3 * * *',
        scheduledTime,
        type: 'scheduled',
      }

      mockApi.dispatchDueReminders.mockResolvedValueOnce({
        scheduledDate: '2026-09-10',
        totalEvaluated: 0,
        totalEnqueued: 0,
        totalSkipped: 0,
        totalAlreadySent: 0,
        errors: [],
      })

      await app.scheduled(event as any, mockEnv, mockCtx)

      expect(mockApi.dispatchDueReminders).toHaveBeenCalledWith({
        scheduledDate: '2026-09-10',
      })
    })

    it('should propagate or handle RPC errors when env.API.dispatchDueReminders fails', async () => {
      const scheduledTime = new Date('2026-09-10T11:00:00.000Z').getTime()
      const event = {
        cron: '0 11 * * 1-5',
        scheduledTime,
        type: 'scheduled',
      }

      mockApi.dispatchDueReminders.mockRejectedValueOnce(
        new Error('Worker-to-Worker RPC connection error'),
      )

      await expect(
        app.scheduled(event as any, mockEnv, mockCtx),
      ).rejects.toThrow(/RPC connection error|Not implemented/)
    })
  })

  describe('fetch handler', () => {
    describe('GET /health', () => {
      it('should return exactly status 200 and json { service: "scheduler", status: "ok" }', async () => {
        const request = new Request('http://localhost/health', { method: 'GET' })
        const res = await app.fetch(request, mockEnv, mockCtx)

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toEqual({ service: 'scheduler', status: 'ok' })
      })
    })

    describe('POST /trigger', () => {
      it('should dispatch reminders for specified date and return 200 with summary', async () => {
        const mockSummary: ReminderDispatchSummary = {
          scheduledDate: '2026-09-15',
          totalEvaluated: 5,
          totalEnqueued: 4,
          totalSkipped: 1,
          totalAlreadySent: 0,
          errors: [],
        }
        mockApi.dispatchDueReminders.mockResolvedValueOnce(mockSummary)

        const request = new Request('http://localhost/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: '2026-09-15' }),
        })

        const res = await app.fetch(request, mockEnv, mockCtx)

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toEqual(mockSummary)
        expect(mockApi.dispatchDueReminders).toHaveBeenCalledWith({
          scheduledDate: '2026-09-15',
        })
      })

      it('should default to current Argentina date when called without body', async () => {
        const expectedDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Argentina/Buenos_Aires',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date())

        const mockSummary: ReminderDispatchSummary = {
          scheduledDate: expectedDate,
          totalEvaluated: 2,
          totalEnqueued: 2,
          totalSkipped: 0,
          totalAlreadySent: 0,
          errors: [],
        }
        mockApi.dispatchDueReminders.mockResolvedValueOnce(mockSummary)

        const request = new Request('http://localhost/trigger', {
          method: 'POST',
        })

        const res = await app.fetch(request, mockEnv, mockCtx)

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toEqual(mockSummary)
        expect(mockApi.dispatchDueReminders).toHaveBeenCalledWith({
          scheduledDate: expectedDate,
        })
      })

      it('should default to current Argentina date when called with empty body object {}', async () => {
        const expectedDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Argentina/Buenos_Aires',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date())

        const mockSummary: ReminderDispatchSummary = {
          scheduledDate: expectedDate,
          totalEvaluated: 0,
          totalEnqueued: 0,
          totalSkipped: 0,
          totalAlreadySent: 0,
          errors: [],
        }
        mockApi.dispatchDueReminders.mockResolvedValueOnce(mockSummary)

        const request = new Request('http://localhost/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })

        const res = await app.fetch(request, mockEnv, mockCtx)

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toEqual(mockSummary)
        expect(mockApi.dispatchDueReminders).toHaveBeenCalledWith({
          scheduledDate: expectedDate,
        })
      })
    })
  })

  describe('getTodayArgentina', () => {
    const originalTz = process.env.TZ

    afterEach(() => {
      if (originalTz !== undefined) {
        process.env.TZ = originalTz
      } else {
        delete process.env.TZ
      }
    })

    it('formats correctly in America/Argentina/Buenos_Aires timezone when process.env.TZ is UTC', () => {
      process.env.TZ = 'UTC'
      const timestamp = new Date('2026-06-15T01:00:00.000Z').getTime()
      const result = getTodayArgentina(timestamp)
      expect(result).toBe('2026-06-14')
    })

    it('returns a valid YYYY-MM-DD date string when called without arguments', () => {
      const result = getTodayArgentina()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      const expected = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date())

      expect(result).toBe(expected)
    })

    it('constructs Intl.DateTimeFormat with America/Argentina/Buenos_Aires and required options', () => {
      const original = Intl.DateTimeFormat
      const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
        this: any,
        ...args: any[]
      ) {
        return new (original as any)(...args)
      })
      try {
        getTodayArgentina(12345)
        expect(spy).toHaveBeenCalledWith(
          'en-CA',
          expect.objectContaining({
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }),
        )
      } finally {
        spy.mockRestore()
      }
    })
  })
})
