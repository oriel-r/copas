import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { remindersRouter } from './reminders.routes'
import type { RemindersDueResponse } from '@copas/contracts'

describe('reminders.routes', () => {
  let mockOrchestratorService: any
  let app: Hono

  beforeEach(() => {
    mockOrchestratorService = {
      getDueRemindersPreview: vi.fn(),
      dispatchDueRemindersForOrg: vi.fn(),
    }

    app = new Hono()
    app.use('*', async (c, next) => {
      ;(c as any).set('services', {
        remindersOrchestrator: mockOrchestratorService,
        reminders: mockOrchestratorService,
      })
      await next()
    })
    app.route('/reminders', remindersRouter)
  })

  describe('GET /reminders/due', () => {
    it('should return 200 with exact RemindersDueResponse structure when valid date and eventSource are provided', async () => {
      const mockResponse: RemindersDueResponse = {
        date: '2026-09-15',
        totalDue: 1,
        items: [
          {
            ruleId: 'rule-1',
            eventSource: 'installment_due',
            offsetDays: -3,
            targetDate: '2026-09-18',
            entityId: 'inst-1',
            policyId: 'pol-1',
            policyNumber: 'POL-123',
            insuredId: 'ins-1',
            insuredFullName: 'JUAN PEREZ',
            insuredPhone: '+5491122223333',
            companyName: 'ALLIANZ',
            totalAmount: 25000,
            currency: 'ARS',
            installmentNumber: 1,
            dueDate: '2026-09-18',
            expirationDate: null,
            isOptedOut: false,
            canDeliver: true,
            skipReason: null,
          },
        ],
      }
      mockOrchestratorService.getDueRemindersPreview.mockResolvedValueOnce(mockResponse)

      const res = await app.request('/reminders/due?date=2026-09-15&eventSource=installment_due')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('date', '2026-09-15')
      expect(data).toHaveProperty('totalDue', 1)
      expect(data).toHaveProperty('items')
      expect(Array.isArray(data.items)).toBe(true)
      expect(data).toEqual(mockResponse)
      expect(mockOrchestratorService.getDueRemindersPreview).toHaveBeenCalledWith({
        date: '2026-09-15',
        eventSource: 'installment_due',
      })
    })

    it('should return 200 with RemindersDueResponse for policy_expiration eventSource', async () => {
      const mockResponse: RemindersDueResponse = {
        date: '2026-09-20',
        totalDue: 1,
        items: [
          {
            ruleId: 'rule-pol-1',
            eventSource: 'policy_expiration',
            offsetDays: -15,
            targetDate: '2026-10-05',
            entityId: 'pol-1',
            policyId: 'pol-1',
            policyNumber: 'POL-EXP-999',
            insuredId: 'ins-1',
            insuredFullName: 'MARIA GARCIA',
            insuredPhone: '+5491188887777',
            companyName: 'MAPFRE',
            totalAmount: 32000,
            currency: 'ARS',
            installmentNumber: null,
            dueDate: null,
            expirationDate: '2026-10-05',
            isOptedOut: false,
            canDeliver: true,
            skipReason: null,
          },
        ],
      }
      mockOrchestratorService.getDueRemindersPreview.mockResolvedValueOnce(mockResponse)

      const res = await app.request('/reminders/due?date=2026-09-20&eventSource=policy_expiration')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('date', '2026-09-20')
      expect(data).toHaveProperty('totalDue', 1)
      expect(data.items).toHaveLength(1)
      expect(data.items[0].eventSource).toBe('policy_expiration')
      expect(data).toEqual(mockResponse)
      expect(mockOrchestratorService.getDueRemindersPreview).toHaveBeenCalledWith({
        date: '2026-09-20',
        eventSource: 'policy_expiration',
      })
    })

    it('should return 200 with exact structure when date query param is omitted', async () => {
      const mockResponse: RemindersDueResponse = {
        date: '2026-09-08',
        totalDue: 0,
        items: [],
      }
      mockOrchestratorService.getDueRemindersPreview.mockResolvedValueOnce(mockResponse)

      const res = await app.request('/reminders/due')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('date')
      expect(data).toHaveProperty('totalDue', 0)
      expect(data).toHaveProperty('items')
      expect(Array.isArray(data.items)).toBe(true)
      expect(data).toEqual(mockResponse)
      expect(mockOrchestratorService.getDueRemindersPreview).toHaveBeenCalledWith({
        date: undefined,
        eventSource: undefined,
      })
    })

    it.each([
      ['DD-MM-YYYY format', '15-09-2026'],
      ['slash separator', '2026/09/15'],
      ['single digit month', '2026-9-15'],
      ['arbitrary string', 'invalid-date'],
    ])('should return 400 when date query parameter has %s', async (_, date) => {
      const res = await app.request(`/reminders/due?date=${date}`)
      expect(res.status).toBe(400)
    })

    it.each([
      ['unsupported string', 'unsupported_source'],
      ['numeric string', '123'],
      ['uppercase variant', 'INSTALLMENT_DUE'],
    ])('should return 400 when eventSource query parameter has %s', async (_, eventSource) => {
      const res = await app.request(`/reminders/due?eventSource=${eventSource}`)
      expect(res.status).toBe(400)
    })

    it('should handle error with status 500 when reminders service is missing in context', async () => {
      const brokenApp = new Hono()
      brokenApp.use('*', async (c, next) => {
        ;(c as any).set('services', {})
        await next()
      })
      brokenApp.route('/reminders', remindersRouter)

      const res = await brokenApp.request('/reminders/due')
      expect(res.status).toBe(500)
    })

    it('should handle error with status 500 when context has no services configured at all', async () => {
      const unconfiguredApp = new Hono()
      unconfiguredApp.route('/reminders', remindersRouter)

      const res = await unconfiguredApp.request('/reminders/due')
      expect(res.status).toBe(500)
    })
  })
})
