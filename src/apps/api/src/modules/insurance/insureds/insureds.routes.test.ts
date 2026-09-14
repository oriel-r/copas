import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import * as routesModule from './insureds.routes'
import {
  insuredsDetailedResponseSchema,
  insuredFilterOptionsSchema,
  type InsuredsDetailedResponse,
  type InsuredFilterOptions,
} from '@copas/contracts'

describe('insureds.routes', () => {
  let mockInsuredsService: any
  let app: Hono

  const mockDetailedResponse: InsuredsDetailedResponse = {
    total: 1,
    items: [
      {
        id: '018f9e2b-1111-7000-8000-000000000001',
        fullName: 'JUAN CARLOS PEREZ',
        cuit: '20123456789',
        phone: '+541112345678',
        email: 'juan.perez@example.com',
        birthDate: '1985-05-20',
        companies: ['Federación Patronal'],
        activePoliciesCount: 1,
        policies: [
          {
            id: '018f9e2b-2222-7000-8000-000000000002',
            policyNumber: 'POL-123456',
            companyId: '018f9e2b-3333-7000-8000-000000000003',
            companyName: 'Federación Patronal',
            branchId: '018f9e2b-4444-7000-8000-000000000004',
            branchName: 'Automotores',
            assetDescription: 'Toyota Corolla 2022 (AB123CD)',
            startDate: '2026-01-01',
            endDate: '2027-01-01',
            status: 'active',
          },
        ],
      },
    ],
  }

  const mockFilterOptions: InsuredFilterOptions = {
    companies: [
      { id: '018f9e2b-3333-7000-8000-000000000003', name: 'Federación Patronal' },
      { id: '018f9e2b-5555-7000-8000-000000000005', name: 'Sancor Seguros' },
    ],
    branches: [
      { id: '018f9e2b-4444-7000-8000-000000000004', name: 'Automotores' },
      { id: '018f9e2b-6666-7000-8000-000000000006', name: 'Hogar' },
    ],
  }

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

      c.set('insuredsService' as any, mockInsuredsService)
      c.set('services' as any, {
        insuredsService: mockInsuredsService,
        insureds: mockInsuredsService,
        insurance: {
          insureds: mockInsuredsService,
          insuredsService: mockInsuredsService,
        },
      })
      await next()
    })

    const router =
      typeof (routesModule as any).createInsuredsRouter === 'function'
        ? (routesModule as any).createInsuredsRouter({
            insuredsService: mockInsuredsService,
          })
        : ((routesModule as any).insuredsRouter ?? (routesModule as any).default)

    testApp.route('/insureds', router)
    return testApp
  }

  beforeEach(() => {
    mockInsuredsService = {
      listDetailed: vi.fn().mockResolvedValue(mockDetailedResponse),
      listInsuredsDetailed: vi.fn().mockResolvedValue(mockDetailedResponse),
      list: vi.fn().mockResolvedValue(mockDetailedResponse),
      getFilterOptions: vi.fn().mockResolvedValue(mockFilterOptions),
      listFilterOptions: vi.fn().mockResolvedValue(mockFilterOptions),
    }
    app = setupApp()
  })

  describe('GET / (list detailed insureds portfolio)', () => {
    it('should return 401 Unauthorized when organizationId is missing in context', async () => {
      const noOrgApp = setupApp({ orgId: null })

      const res = await noOrgApp.request('/insureds')

      expect(res.status).toBe(401)
    })

    it('should return 200 with InsuredsDetailedResponse matching contract when parameters are valid', async () => {
      const res = await app.request('/insureds?policyStatus=active&limit=10&offset=0')

      expect(res.status).toBe(200)
      const data = await res.json()

      const validationResult = insuredsDetailedResponseSchema.safeParse(data)
      expect(validationResult.success).toBe(true)
      expect(data).toEqual(mockDetailedResponse)

      const wasCalled =
        mockInsuredsService.listDetailed.mock.calls.length > 0 ||
        mockInsuredsService.listInsuredsDetailed.mock.calls.length > 0 ||
        mockInsuredsService.list.mock.calls.length > 0
      expect(wasCalled).toBe(true)
    })

    it('should return 200 with default parameters when no query params are provided', async () => {
      const res = await app.request('/insureds')

      expect(res.status).toBe(200)
      const data = await res.json()

      const validationResult = insuredsDetailedResponseSchema.safeParse(data)
      expect(validationResult.success).toBe(true)
    })

    it('should accept valid companyId, branchId, and policyStatus filters', async () => {
      const compId = '018f9e2b-3333-7000-8000-000000000003'
      const branchId = '018f9e2b-4444-7000-8000-000000000004'

      const res = await app.request(
        `/insureds?companyId=${compId}&branchId=${branchId}&policyStatus=active&limit=20&offset=10`,
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(insuredsDetailedResponseSchema.safeParse(data).success).toBe(true)
    })

    it.each(['all', 'active', 'expired', 'cancelled'] as const)(
      'should accept valid policyStatus="%s"',
      async (status) => {
        const res = await app.request(`/insureds?policyStatus=${status}`)
        expect(res.status).toBe(200)
      },
    )

    it('should return 400 Bad Request when policyStatus is invalid', async () => {
      const res = await app.request('/insureds?policyStatus=invalid_status')

      expect(res.status).toBe(400)
    })

    it.each([
      ['non-numeric limit', 'limit=not-a-number'],
      ['non-numeric offset', 'offset=not-a-number'],
    ])('should return 400 Bad Request when %s is provided', async (_, queryString) => {
      const res = await app.request(`/insureds?${queryString}`)

      expect(res.status).toBe(400)
    })
  })

  describe('GET /filter-options', () => {
    it('should return 401 Unauthorized when organizationId is missing in context', async () => {
      const noOrgApp = setupApp({ orgId: null })

      const res = await noOrgApp.request('/insureds/filter-options')

      expect(res.status).toBe(401)
    })

    it('should return 200 with InsuredFilterOptions contract structure', async () => {
      const res = await app.request('/insureds/filter-options')

      expect(res.status).toBe(200)
      const data = await res.json()

      const validationResult = insuredFilterOptionsSchema.safeParse(data)
      expect(validationResult.success).toBe(true)
      expect(data).toEqual(mockFilterOptions)
      expect(Array.isArray(data.companies)).toBe(true)
      expect(Array.isArray(data.branches)).toBe(true)
    })

    it('should include id and name strings in each company and branch option', async () => {
      const res = await app.request('/insureds/filter-options')

      expect(res.status).toBe(200)
      const data = (await res.json()) as InsuredFilterOptions

      for (const comp of data.companies) {
        expect(typeof comp.id).toBe('string')
        expect(typeof comp.name).toBe('string')
      }

      for (const branch of data.branches) {
        expect(typeof branch.id).toBe('string')
        expect(typeof branch.name).toBe('string')
      }
    })
  })
})
