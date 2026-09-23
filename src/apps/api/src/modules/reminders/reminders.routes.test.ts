import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { remindersRouter } from './reminders.routes'
import {
  type ReminderDispatchSummary,
  type RemindersDueResponse,
  type InstallmentReminderResult,
  reminderDispatchSummarySchema,
  installmentReminderResultSchema,
  ReminderInstallmentNotFoundError,
  ReminderAlreadySentError,
  NoActiveReminderRuleError,
  getTodayArgentina,
} from '@copas/contracts'

describe('reminders.routes', () => {
  let mockOrchestratorService: any
  let app: Hono

  const defaultOrgId = '018f9e2b-0000-7000-8000-000000000001'

  const setupApp = (options: { orgId?: string | null; services?: any } = {}) => {
    const testApp = new Hono()
    testApp.use('*', async (c, next) => {
      if (options.orgId !== undefined) {
        if (options.orgId !== null) {
          c.set('organizationId' as any, options.orgId)
        }
      } else {
        c.set('organizationId' as any, defaultOrgId)
      }

      if (options.services !== undefined) {
        if (options.services !== null) {
          c.set('services' as any, options.services)
        }
      } else {
        c.set('remindersOrchestrator' as any, mockOrchestratorService)
        c.set('reminders' as any, mockOrchestratorService)
        c.set('services' as any, {
          remindersOrchestrator: mockOrchestratorService,
          reminders: mockOrchestratorService,
        })
      }
      await next()
    })
    testApp.route('/reminders', remindersRouter)
    return testApp
  }

  beforeEach(() => {
    mockOrchestratorService = {
      getDueRemindersPreview: vi.fn(),
      dispatchDueRemindersForOrg: vi.fn(),
      dispatchInstallmentReminder: vi.fn(),
    }

    app = setupApp()
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

  describe('POST /reminders/executions', () => {
    const validSummary: ReminderDispatchSummary = {
      scheduledDate: '2026-09-23',
      totalEvaluated: 12,
      totalEnqueued: 10,
      totalSkipped: 2,
      totalAlreadySent: 0,
      errors: [],
    }

    it('should return 201 Created when passing scheduledDate returning ReminderDispatchSummary', async () => {
      mockOrchestratorService.dispatchDueRemindersForOrg.mockResolvedValueOnce(validSummary)

      const res = await app.request('/reminders/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: '2026-09-23' }),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      const validation = reminderDispatchSummarySchema.safeParse(data)
      expect(validation.success).toBe(true)
      expect(data).toEqual(validSummary)

      const firstCallArg = mockOrchestratorService.dispatchDueRemindersForOrg.mock.calls[0][0]
      if (typeof firstCallArg === 'object') {
        expect(firstCallArg).toMatchObject({
          organizationId: defaultOrgId,
          scheduledDate: '2026-09-23',
        })
      } else {
        expect(mockOrchestratorService.dispatchDueRemindersForOrg).toHaveBeenCalledWith(
          defaultOrgId,
          '2026-09-23',
        )
      }
    })

    it('should return 201 Created when passing empty body {}, defaulting scheduledDate to Argentina today', async () => {
      const todayArg = getTodayArgentina()
      const defaultSummary: ReminderDispatchSummary = {
        ...validSummary,
        scheduledDate: todayArg,
      }
      mockOrchestratorService.dispatchDueRemindersForOrg.mockResolvedValueOnce(defaultSummary)

      const res = await app.request('/reminders/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      const validation = reminderDispatchSummarySchema.safeParse(data)
      expect(validation.success).toBe(true)
      expect(data).toEqual(defaultSummary)

      const callArgs = mockOrchestratorService.dispatchDueRemindersForOrg.mock.calls[0]
      if (typeof callArgs[0] === 'object') {
        expect(callArgs[0]).toMatchObject({ organizationId: defaultOrgId })
        if (callArgs[0].scheduledDate !== undefined) {
          expect(callArgs[0].scheduledDate).toBe(todayArg)
        }
      } else {
        expect(callArgs[0]).toBe(defaultOrgId)
        if (callArgs[1] !== undefined) {
          expect(callArgs[1]).toBe(todayArg)
        }
      }
    })

    it.each([
      ['arbitrary string', 'invalid'],
      ['slash separator', '2026/09/23'],
      ['DD-MM-YYYY format', '23-09-2026'],
      ['single digit month', '2026-9-23'],
      ['single digit day', '2026-09-3'],
      ['number type', 20260923],
    ])('should return 400 Bad Request when passing invalid scheduledDate (%s)', async (_, invalidDate) => {
      const res = await app.request('/reminders/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: invalidDate }),
      })

      expect(res.status).toBe(400)
      expect(mockOrchestratorService.dispatchDueRemindersForOrg).not.toHaveBeenCalled()
    })

    it('should return 401 Unauthorized when organizationId is missing in context', async () => {
      const unauthApp = setupApp({ orgId: null })

      const res = await unauthApp.request('/reminders/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: '2026-09-23' }),
      })

      expect(res.status).toBe(401)
      expect(mockOrchestratorService.dispatchDueRemindersForOrg).not.toHaveBeenCalled()
    })
  })

  describe('POST /reminders/installments/:id', () => {
    const testInstallmentId = '018f9e2b-3333-7000-8000-000000000003'
    const testRuleId = '018f9e2b-1111-7000-8000-000000000001'
    const testHash = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'

    it('should return 201 Created with status: "enqueued", messageId, skipReason: null, deduplicationHash when successful', async () => {
      const mockResult: InstallmentReminderResult = {
        installmentId: testInstallmentId,
        ruleId: testRuleId,
        deduplicationHash: testHash,
        status: 'enqueued',
        messageId: '018f9e2b-5555-7000-8000-000000000005',
        skipReason: null,
      }
      mockOrchestratorService.dispatchInstallmentReminder.mockResolvedValueOnce(mockResult)

      const res = await app.request(`/reminders/installments/${testInstallmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      const validation = installmentReminderResultSchema.safeParse(data)
      expect(validation.success).toBe(true)
      expect(data).toEqual(mockResult)
      expect(mockOrchestratorService.dispatchInstallmentReminder).toHaveBeenCalledWith(
        testInstallmentId,
        expect.anything(),
      )
    })

    it.each([
      ['missing_phone', 'missing_phone'],
      ['opt_out', 'opt_out'],
    ])('should return 201 Created with status: "skipped" and skipReason: %s', async (_, skipReason) => {
      const mockResult: InstallmentReminderResult = {
        installmentId: testInstallmentId,
        ruleId: testRuleId,
        deduplicationHash: testHash,
        status: 'skipped',
        messageId: null,
        skipReason,
      }
      mockOrchestratorService.dispatchInstallmentReminder.mockResolvedValueOnce(mockResult)

      const res = await app.request(`/reminders/installments/${testInstallmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      const validation = installmentReminderResultSchema.safeParse(data)
      expect(validation.success).toBe(true)
      expect(data.status).toBe('skipped')
      expect(data.skipReason).toBe(skipReason)
      expect(data.messageId).toBeNull()
    })

    it('should return 409 Conflict when already sent and forceResend is false', async () => {
      mockOrchestratorService.dispatchInstallmentReminder.mockRejectedValueOnce(
        new ReminderAlreadySentError(),
      )

      const res = await app.request(`/reminders/installments/${testInstallmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceResend: false }),
      })

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('should return 201 Created when already sent and forceResend is true', async () => {
      const mockResult: InstallmentReminderResult = {
        installmentId: testInstallmentId,
        ruleId: testRuleId,
        deduplicationHash: testHash,
        status: 'enqueued',
        messageId: '018f9e2b-6666-7000-8000-000000000006',
        skipReason: null,
      }
      mockOrchestratorService.dispatchInstallmentReminder.mockResolvedValueOnce(mockResult)

      const res = await app.request(`/reminders/installments/${testInstallmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceResend: true }),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data).toEqual(mockResult)
      expect(mockOrchestratorService.dispatchInstallmentReminder).toHaveBeenCalledWith(
        testInstallmentId,
        expect.objectContaining({ forceResend: true }),
      )
    })

    it('should return 404 Not Found when installment not found / belongs to another org', async () => {
      mockOrchestratorService.dispatchInstallmentReminder.mockRejectedValueOnce(
        new ReminderInstallmentNotFoundError(),
      )

      const res = await app.request(`/reminders/installments/${testInstallmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('should return 422 Unprocessable Entity when no active reminder rule exists for cuotas', async () => {
      mockOrchestratorService.dispatchInstallmentReminder.mockRejectedValueOnce(
        new NoActiveReminderRuleError(),
      )

      const res = await app.request(`/reminders/installments/${testInstallmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('should return 401 Unauthorized when organizationId is missing in context', async () => {
      const unauthApp = setupApp({ orgId: null })

      const res = await unauthApp.request(`/reminders/installments/${testInstallmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(401)
      expect(mockOrchestratorService.dispatchInstallmentReminder).not.toHaveBeenCalled()
    })

    it.each([
      ['invalid scheduledDate', { scheduledDate: 'invalid-date' }],
      ['non-boolean forceResend', { forceResend: 'yes' as any }],
    ])('should return 400 Bad Request when request body has %s', async (_, invalidBody) => {
      const res = await app.request(`/reminders/installments/${testInstallmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidBody),
      })

      expect(res.status).toBe(400)
      expect(mockOrchestratorService.dispatchInstallmentReminder).not.toHaveBeenCalled()
    })
  })
})
