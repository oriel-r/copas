import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { createPoliciesRouter } from './policies.routes'

describe('policies.routes', () => {
  let mockPoliciesService: any
  let app: Hono

  beforeEach(() => {
    mockPoliciesService = {
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      processAiResult: vi.fn(),
    }

    app = new Hono()
    const router = createPoliciesRouter({ policiesService: mockPoliciesService })
    app.route('/policies', router)
  })

  describe('GET /policies', () => {
    it('should return 200 with list of policies', async () => {
      const policies = [
        { id: 'pol-1', policyNumber: 'POL-123', premiumTotal: 100000, status: 'active' },
      ]
      mockPoliciesService.list.mockResolvedValueOnce(policies)

      const res = await app.request('/policies')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(policies)
    })
  })

  describe('GET /policies/:id', () => {
    it('should return 200 when policy exists', async () => {
      const policy = { id: 'pol-1', policyNumber: 'POL-123' }
      mockPoliciesService.getById.mockResolvedValueOnce(policy)

      const res = await app.request('/policies/pol-1')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(policy)
    })

    it('should return 404 when policy not found', async () => {
      mockPoliciesService.getById.mockResolvedValueOnce(null)

      const res = await app.request('/policies/pol-999')
      expect(res.status).toBe(404)
    })
  })

  describe('POST /policies', () => {
    it('should return 201 when valid policy payload is provided', async () => {
      const payload = {
        companyId: '018f9e2b-1111-7000-8000-000000000001',
        insuredId: '018f9e2b-2222-7000-8000-000000000002',
        policyNumber: 'POL-NEW',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
      }
      const created = { id: 'pol-new', ...payload }
      mockPoliciesService.create.mockResolvedValueOnce(created)

      const res = await app.request('/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data).toEqual(created)
    })

    it('should return 400 when startDate is after endDate', async () => {
      const invalidPayload = {
        companyId: '018f9e2b-1111-7000-8000-000000000001',
        insuredId: '018f9e2b-2222-7000-8000-000000000002',
        startDate: '2027-01-01',
        endDate: '2026-01-01',
      }

      const res = await app.request('/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /policies/process-ai-result', () => {
    it('should return 200/201 when valid extraction payload is sent', async () => {
      const payload = {
        aiExtractionResultId: '018f9e2b-0000-7000-8000-000000000000',
        organizationId: '018f9e2b-0000-7000-8000-000000000001',
        uploadedBy: '018f9e2b-0000-7000-8000-000000000002',
        structuredPayload: {
          company: { name: 'SANCOR', code: 'SANCOR' },
          branch: { code: 'AUTO' },
          policy: {
            policyNumber: 'POL-1',
            premiumTotal: 100000,
            currency: 'ARS',
            startDate: '2026-01-01',
            endDate: '2027-01-01',
            billingFrequency: 'monthly',
          },
          insured: {
            fullName: 'JUAN PEREZ',
            cuit: '20123456789',
            email: 'juan@example.com',
            phone: '541112345678',
            birthDate: '1990-01-01',
          },
          assetType: { code: 'AUTO' },
          asset: { properties: { PATENTE: 'AB123CD' } },
          paymentMethod: { code: 'AUTOMATICO_DEBITO' },
          coverages: [],
          installments: [
            { installmentNumber: 1, dueDate: '2026-01-10', totalAmount: 10000 },
          ],
        },
      }

      mockPoliciesService.processAiResult.mockResolvedValueOnce({ id: 'pol-created' })

      const res = await app.request('/policies/process-ai-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      expect([200, 201]).toContain(res.status)
    })
  })
})
