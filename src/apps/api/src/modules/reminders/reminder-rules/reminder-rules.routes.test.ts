import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { reminderRulesRouter } from './reminder-rules.routes'

describe('reminder-rules.routes', () => {
  let mockReminderRulesService: any
  let app: Hono

  beforeEach(() => {
    mockReminderRulesService = {
      listRules: vi.fn(),
      getActiveRules: vi.fn(),
      getRuleById: vi.fn(),
      createRule: vi.fn(),
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
    }

    app = new Hono()
    app.use('*', async (c, next) => {
      ;(c as any).set('services', {
        reminderRulesService: mockReminderRulesService,
      })
      await next()
    })
    app.route('/reminder-rules', reminderRulesRouter)
  })

  describe('GET /reminder-rules', () => {
    it('should return 200 with rules and presets', async () => {
      const mockRules = [
        {
          id: '018f9e2b-1111-7000-8000-000000000001',
          organizationId: 'org-1',
          eventSource: 'installment_due',
          offsetDays: -3,
          isEnabled: true,
        },
      ]
      mockReminderRulesService.listRules.mockResolvedValueOnce(mockRules)

      const res = await app.request('/reminder-rules')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ data: mockRules })
    })

    it('should call listRules or getActiveRules when active query is provided', async () => {
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([])
      mockReminderRulesService.listRules.mockResolvedValueOnce([])

      const res = await app.request('/reminder-rules?active=true')
      expect(res.status).toBe(200)
    })
  })

  describe('POST /reminder-rules', () => {
    const validPayload = {
      organizationId: '018f9e2b-1111-7000-8000-000000000001',
      eventSource: 'installment_due',
      offsetDays: -3,
      templateId: '018f9e2b-2222-7000-8000-000000000002',
      isEnabled: true,
    }

    it('should return 201 when payload is valid', async () => {
      const created = { id: '018f9e2b-3333-7000-8000-000000000003', ...validPayload }
      mockReminderRulesService.createRule.mockResolvedValueOnce(created)

      const res = await app.request('/reminder-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      })

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body).toEqual({ data: created })
      expect(mockReminderRulesService.createRule).toHaveBeenCalledWith(validPayload)
    })

    it.each([
      ['greater than 30', { ...validPayload, offsetDays: 31 }],
      ['less than -30', { ...validPayload, offsetDays: -31 }],
      ['non-integer float', { ...validPayload, offsetDays: 3.5 }],
      ['string offsetDays', { ...validPayload, offsetDays: 'five' as any }],
      ['missing eventSource', { organizationId: '018f9e2b-1111-7000-8000-000000000001', offsetDays: 0 }],
      ['non-string eventSource', { ...validPayload, eventSource: 123 as any }],
    ])('should return 400 when %s', async (_, invalidPayload) => {
      const res = await app.request('/reminder-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it.each([-30, 0, 30])('should return 201 for boundary offsetDays %i', async (offsetDays) => {
      const payload = { ...validPayload, offsetDays }
      mockReminderRulesService.createRule.mockResolvedValueOnce({ id: 'rule-boundary', ...payload })

      const res = await app.request('/reminder-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      expect(res.status).toBe(201)
      expect(mockReminderRulesService.createRule).toHaveBeenCalledWith(payload)
    })
  })

  describe('GET /reminder-rules/:id', () => {
    it('should return 200 when rule exists', async () => {
      const rule = {
        id: '018f9e2b-1111-7000-8000-000000000001',
        organizationId: 'org-1',
        eventSource: 'installment_due',
        offsetDays: 0,
        isEnabled: true,
      }
      mockReminderRulesService.getRuleById.mockResolvedValueOnce(rule)

      const res = await app.request('/reminder-rules/018f9e2b-1111-7000-8000-000000000001')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ data: rule })
      expect(mockReminderRulesService.getRuleById).toHaveBeenCalledWith('018f9e2b-1111-7000-8000-000000000001')
    })

    it('should return 404 when rule does not exist', async () => {
      mockReminderRulesService.getRuleById.mockResolvedValueOnce(null)

      const res = await app.request('/reminder-rules/018f9e2b-1111-7000-8000-000000000000')
      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })
  })

  describe('PATCH /reminder-rules/:id', () => {
    it('should return 200 on valid update', async () => {
      const updatePayload = {
        offsetDays: -5,
        isEnabled: false,
      }
      const updated = { id: '018f9e2b-1111-7000-8000-000000000001', ...updatePayload }
      mockReminderRulesService.updateRule.mockResolvedValueOnce(updated)

      const res = await app.request('/reminder-rules/018f9e2b-1111-7000-8000-000000000001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ data: updated })
      expect(mockReminderRulesService.updateRule).toHaveBeenCalledWith(
        '018f9e2b-1111-7000-8000-000000000001',
        updatePayload,
      )
    })

    it('should handle updating rule when service returns result or null', async () => {
      mockReminderRulesService.updateRule.mockResolvedValueOnce(null)

      const res = await app.request('/reminder-rules/018f9e2b-1111-7000-8000-000000000000', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: false }),
      })

      const body = await res.json()
      expect(res.status).toBe(200)
      expect(body).toEqual({ data: null })
    })

    it.each([
      ['offsetDays > 30', { offsetDays: 31 }],
      ['offsetDays < -30', { offsetDays: -31 }],
      ['float offsetDays', { offsetDays: 1.5 }],
    ])('should return 400 when %s provided to PATCH', async (_, payload) => {
      const res = await app.request('/reminder-rules/018f9e2b-1111-7000-8000-000000000001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /reminder-rules/:id', () => {
    it('should return 200 on successful delete', async () => {
      mockReminderRulesService.deleteRule.mockResolvedValueOnce(true)

      const res = await app.request('/reminder-rules/018f9e2b-1111-7000-8000-000000000001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ success: true })
      expect(mockReminderRulesService.deleteRule).toHaveBeenCalledWith('018f9e2b-1111-7000-8000-000000000001')
    })

    it('should return 404 when deleting non-existent rule', async () => {
      mockReminderRulesService.deleteRule.mockResolvedValueOnce(false)

      const res = await app.request('/reminder-rules/018f9e2b-1111-7000-8000-000000000000', {
        method: 'DELETE',
      })

      expect(res.status).toBe(404)
    })
  })
})
