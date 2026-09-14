import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import * as routesModule from './installments.routes'
import type { InstallmentsDetailedResponse } from '@copas/contracts'

describe('installments.routes', () => {
  let mockPolicyInstallmentsService: any
  let app: Hono

  const setupApp = (options: { orgId?: string | null } = {}) => {
    const testApp = new Hono()

    testApp.use('*', async (c, next) => {
      if (options.orgId !== undefined) {
        if (options.orgId !== null) {
          c.set('organizationId' as any, options.orgId)
        }
      } else {
        c.set('organizationId' as any, '018f9e2b-0000-7000-8000-000000000001')
      }

      c.set('policyInstallmentsService' as any, mockPolicyInstallmentsService)
      c.set('services' as any, {
        policyInstallmentsService: mockPolicyInstallmentsService,
        policyInstallments: mockPolicyInstallmentsService,
        insurance: {
          policyInstallments: mockPolicyInstallmentsService,
          policyInstallmentsService: mockPolicyInstallmentsService,
        },
      })
      await next()
    })

    const router =
      typeof (routesModule as any).createInstallmentsRouter === 'function'
        ? (routesModule as any).createInstallmentsRouter({
            policyInstallmentsService: mockPolicyInstallmentsService,
          })
        : ((routesModule as any).installmentsRouter ?? (routesModule as any).default)

    testApp.route('/installments', router)
    return testApp
  }

  beforeEach(() => {
    mockPolicyInstallmentsService = {
      listInstallments: vi.fn(),
      markAsPaid: vi.fn(),
      updateStatus: vi.fn(),
      getById: vi.fn(),
    }
    app = setupApp()
  })

  describe('GET /installments', () => {
    it('should return 200 with InstallmentsDetailedResponse when query parameters are valid', async () => {
      const mockResponse: InstallmentsDetailedResponse = {
        appliedFilters: {
          dueDate: '2026-09-15',
          status: 'pending',
          companyId: null,
          insuredId: null,
        },
        total: 1,
        items: [
          {
            installmentId: '018f9e2b-1111-7000-8000-000000000001',
            policyId: '018f9e2b-2222-7000-8000-000000000002',
            policyNumber: 'POL-12345',
            installmentNumber: 1,
            insuredName: 'JUAN PEREZ',
            companyName: 'FEDERACION PATRONAL',
            assetDescription: 'TOYOTA COROLLA (AB123CD)',
            totalAmount: 125000,
            currency: 'ARS',
            dueDate: '2026-09-15',
            status: 'pending',
          },
        ],
      }
      mockPolicyInstallmentsService.listInstallments.mockResolvedValueOnce(mockResponse)

      const res = await app.request('/installments?dueDate=2026-09-15&status=pending')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(mockResponse)
      expect(mockPolicyInstallmentsService.listInstallments).toHaveBeenCalledWith(
        expect.objectContaining({
          dueDate: '2026-09-15',
          status: 'pending',
        }),
      )
    })

    it('should return 200 with default parameters when no query params are provided', async () => {
      const mockResponse: InstallmentsDetailedResponse = {
        appliedFilters: {
          dueDate: '2026-09-15',
          status: 'pending',
          companyId: null,
          insuredId: null,
        },
        total: 0,
        items: [],
      }
      mockPolicyInstallmentsService.listInstallments.mockResolvedValueOnce(mockResponse)

      const res = await app.request('/installments')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(mockResponse)
      expect(mockPolicyInstallmentsService.listInstallments).toHaveBeenCalled()
    })

    it('should forward companyId, insuredId, limit, and offset query parameters', async () => {
      const compId = '018f9e2b-3333-7000-8000-000000000003'
      const insId = '018f9e2b-4444-7000-8000-000000000004'

      mockPolicyInstallmentsService.listInstallments.mockResolvedValueOnce({
        appliedFilters: {
          dueDate: '2026-09-15',
          status: 'all',
          companyId: compId,
          insuredId: insId,
        },
        total: 0,
        items: [],
      })

      const res = await app.request(
        `/installments?companyId=${compId}&insuredId=${insId}&status=all&limit=25&offset=50`,
      )

      expect(res.status).toBe(200)
      expect(mockPolicyInstallmentsService.listInstallments).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: compId,
          insuredId: insId,
          status: 'all',
          limit: 25,
          offset: 50,
        }),
      )
    })

    it('should reject with 400 Bad Request when status query param is invalid', async () => {
      const res = await app.request('/installments?status=unsupported_status')
      expect(res.status).toBe(400)
    })

    it('should reject with 400 Bad Request when limit exceeds maximum (100) or is negative', async () => {
      const res1 = await app.request('/installments?limit=150')
      expect(res1.status).toBe(400)

      const res2 = await app.request('/installments?limit=-1')
      expect(res2.status).toBe(400)
    })

    it('should reject with 400 Bad Request when companyId is not a valid UUIDv7', async () => {
      const res = await app.request('/installments?companyId=not-a-uuid')
      expect(res.status).toBe(400)
    })

    it('should return 400 or 401 when organizationId is missing in request context', async () => {
      const noOrgApp = setupApp({ orgId: null })
      const res = await noOrgApp.request('/installments')
      expect([400, 401]).toContain(res.status)
    })
  })

  describe('PATCH /installments/:id', () => {
    it('should return 200 with updated installment when marking status as paid', async () => {
      const installmentId = '018f9e2b-1111-7000-8000-000000000001'
      const updated = {
        id: installmentId,
        status: 'paid',
      }
      mockPolicyInstallmentsService.updateStatus.mockResolvedValueOnce(updated)
      mockPolicyInstallmentsService.markAsPaid.mockResolvedValueOnce(updated)

      const res = await app.request(`/installments/${installmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(updated)
    })

    it('should return 200 with updated installment when status is pending or overdue', async () => {
      const installmentId = '018f9e2b-1111-7000-8000-000000000001'
      const updated = {
        id: installmentId,
        status: 'overdue',
      }
      mockPolicyInstallmentsService.updateStatus.mockResolvedValueOnce(updated)

      const res = await app.request(`/installments/${installmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'overdue' }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(updated)
    })

    it('should return 400 Bad Request when status is invalid', async () => {
      const res = await app.request('/installments/018f9e2b-1111-7000-8000-000000000001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'unknown_status' }),
      })

      expect(res.status).toBe(400)
    })

    it('should return 400 Bad Request when request body is empty or missing status', async () => {
      const res = await app.request('/installments/018f9e2b-1111-7000-8000-000000000001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
    })

    it('should return 404 Not Found when installment to update is not found', async () => {
      mockPolicyInstallmentsService.updateStatus.mockResolvedValueOnce(null)
      mockPolicyInstallmentsService.markAsPaid.mockResolvedValueOnce(null)

      const res = await app.request('/installments/018f9e2b-9999-7000-8000-000000000009', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })

      expect(res.status).toBe(404)
    })
  })
})
