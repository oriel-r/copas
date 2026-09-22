import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import * as routesModule from './insureds.routes'
import {
  insuredDetailResponseSchema,
  insuredResponseSchema,
  insuredsDetailedResponseSchema,
  insuredFilterOptionsSchema,
  type InsuredDetailResponse,
  type InsuredResponse,
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

  const mockDetailResponse: InsuredDetailResponse = {
    id: '018f9e2b-1111-7000-8000-000000000001',
    organizationId: '018f9e2b-0000-7000-8000-000000000001',
    uploadedBy: '018f9e2b-9999-7000-8000-000000000001',
    fullName: 'JUAN CARLOS PEREZ',
    cuit: '20-30000000-3',
    phone: '+541112345678',
    email: 'juan.perez@example.com',
    birthDate: '1985-05-20',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    companies: ['Federación Patronal', 'Sancor Seguros'],
    activePoliciesCount: 2,
    totalPoliciesCount: 3,
    latestPolicy: {
      id: '018f9e2b-2222-7000-8000-000000000002',
      policyNumber: 'POL-123456',
      companyId: '018f9e2b-3333-7000-8000-000000000003',
      companyName: 'Federación Patronal',
      branchId: '018f9e2b-4444-7000-8000-000000000004',
      branchName: 'Automotores',
      assetDescription: 'Toyota Corolla 2022 (AB123CD)',
      startDate: '2026-06-01',
      endDate: '2027-06-01',
      status: 'active',
    },
  }

  const mockInsuredResponse: InsuredResponse = {
    id: '018f9e2b-1111-7000-8000-000000000001',
    organizationId: '018f9e2b-0000-7000-8000-000000000001',
    uploadedBy: '018f9e2b-9999-7000-8000-000000000001',
    fullName: 'JUAN CARLOS PEREZ',
    cuit: '20-30000000-3',
    phone: '+541112345678',
    email: 'juan.perez@example.com',
    birthDate: '1985-05-20',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
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
      getDetailById: vi.fn().mockResolvedValue(mockDetailResponse),
      updateProfile: vi.fn().mockResolvedValue(mockInsuredResponse),
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

  describe('GET /:id (insured detail)', () => {
    it('should return 401 Unauthorized when organizationId is missing in context', async () => {
      const noOrgApp = setupApp({ orgId: null })

      const res = await noOrgApp.request('/insureds/018f9e2b-1111-7000-8000-000000000001')

      expect(res.status).toBe(401)
    })

    it('should return 200 with InsuredDetailResponse for insured with active and expired policies', async () => {
      mockInsuredsService.getDetailById.mockResolvedValueOnce(mockDetailResponse)

      const res = await app.request('/insureds/018f9e2b-1111-7000-8000-000000000001')

      expect(res.status).toBe(200)
      const data = await res.json()

      const validationResult = insuredDetailResponseSchema.safeParse({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      })
      expect(validationResult.success).toBe(true)
      expect(data.id).toBe('018f9e2b-1111-7000-8000-000000000001')
      expect(data.activePoliciesCount).toBe(2)
      expect(data.totalPoliciesCount).toBe(3)
      expect(data.companies).toEqual(['Federación Patronal', 'Sancor Seguros'])
      expect(data.latestPolicy).not.toBeNull()
      expect(data.latestPolicy.status).toBe('active')
      expect(data.latestPolicy.policyNumber).toBe('POL-123456')
      expect(mockInsuredsService.getDetailById).toHaveBeenCalledWith('018f9e2b-1111-7000-8000-000000000001')
    })

    it('should return 200 with activePoliciesCount=0, totalPoliciesCount=0, companies=[], and latestPolicy=null when insured has no policies', async () => {
      const noPoliciesDetail: InsuredDetailResponse = {
        ...mockDetailResponse,
        activePoliciesCount: 0,
        totalPoliciesCount: 0,
        companies: [],
        latestPolicy: null,
      }
      mockInsuredsService.getDetailById.mockResolvedValueOnce(noPoliciesDetail)

      const res = await app.request('/insureds/018f9e2b-1111-7000-8000-000000000001')

      expect(res.status).toBe(200)
      const data = await res.json()

      const validationResult = insuredDetailResponseSchema.safeParse({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      })
      expect(validationResult.success).toBe(true)
      expect(data.activePoliciesCount).toBe(0)
      expect(data.totalPoliciesCount).toBe(0)
      expect(data.companies).toEqual([])
      expect(data.latestPolicy).toBeNull()
    })

    it('should return 200 where latestPolicy is the last historical policy when insured has only non-active policies', async () => {
      const nonActiveDetail: InsuredDetailResponse = {
        ...mockDetailResponse,
        activePoliciesCount: 0,
        totalPoliciesCount: 2,
        companies: ['Federación Patronal'],
        latestPolicy: {
          id: '018f9e2b-2222-7000-8000-000000000099',
          policyNumber: 'POL-EXPIRED-HISTORICAL',
          companyId: '018f9e2b-3333-7000-8000-000000000003',
          companyName: 'Federación Patronal',
          branchId: '018f9e2b-4444-7000-8000-000000000004',
          branchName: 'Automotores',
          assetDescription: 'Ford Focus 2019',
          startDate: '2024-01-01',
          endDate: '2025-01-01',
          status: 'expired',
        },
      }
      mockInsuredsService.getDetailById.mockResolvedValueOnce(nonActiveDetail)

      const res = await app.request('/insureds/018f9e2b-1111-7000-8000-000000000001')

      expect(res.status).toBe(200)
      const data = await res.json()

      const validationResult = insuredDetailResponseSchema.safeParse({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      })
      expect(validationResult.success).toBe(true)
      expect(data.activePoliciesCount).toBe(0)
      expect(data.totalPoliciesCount).toBe(2)
      expect(data.latestPolicy).not.toBeNull()
      expect(data.latestPolicy.status).toBe('expired')
      expect(data.latestPolicy.policyNumber).toBe('POL-EXPIRED-HISTORICAL')
    })

    it('should return 404 Not Found if insured does not exist or has deletedAt != null', async () => {
      mockInsuredsService.getDetailById.mockResolvedValueOnce(null)

      const res = await app.request('/insureds/018f9e2b-9999-7000-8000-000000000009')

      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /:id (update insured profile)', () => {
    it('should return 401 Unauthorized when organizationId is missing in context', async () => {
      const noOrgApp = setupApp({ orgId: null })

      const res = await noOrgApp.request('/insureds/018f9e2b-1111-7000-8000-000000000001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'CARLOS PEREZ' }),
      })

      expect(res.status).toBe(401)
    })

    it('should return 200 with InsuredResponse after updating valid fields (fullName, phone, email, birthDate)', async () => {
      const updatePayload = {
        fullName: 'JUAN MANUEL PEREZ',
        phone: '+541198765432',
        email: 'juan.updated@example.com',
        birthDate: '1985-05-22',
      }
      const updatedResponse: InsuredResponse = {
        ...mockInsuredResponse,
        ...updatePayload,
      }
      mockInsuredsService.updateProfile.mockResolvedValueOnce(updatedResponse)

      const res = await app.request('/insureds/018f9e2b-1111-7000-8000-000000000001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })

      expect(res.status).toBe(200)
      const data = await res.json()

      const validationResult = insuredResponseSchema.safeParse({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      })
      expect(validationResult.success).toBe(true)
      expect(data.fullName).toBe('JUAN MANUEL PEREZ')
      expect(data.phone).toBe('+541198765432')
      expect(data.email).toBe('juan.updated@example.com')
      expect(data.birthDate).toBe('1985-05-22')
      expect(mockInsuredsService.updateProfile).toHaveBeenCalledWith(
        '018f9e2b-1111-7000-8000-000000000001',
        updatePayload,
      )
    })

    it('should return 200 OK when CUIT sent is the same that insured already has (no false conflict with self)', async () => {
      const payload = { cuit: '20-30000000-3' }
      mockInsuredsService.updateProfile.mockResolvedValueOnce(mockInsuredResponse)

      const res = await app.request('/insureds/018f9e2b-1111-7000-8000-000000000001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      expect(res.status).toBe(200)
      expect(mockInsuredsService.updateProfile).toHaveBeenCalledWith(
        '018f9e2b-1111-7000-8000-000000000001',
        payload,
      )
    })

    it('should return 409 Conflict with { error: "Conflict", message: "CUIT already registered" } if CUIT already exists in another insured in the organization', async () => {
      mockInsuredsService.updateProfile.mockRejectedValueOnce(new Error('CUIT already registered'))

      const res = await app.request('/insureds/018f9e2b-1111-7000-8000-000000000001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuit: '27-30000000-8' }),
      })

      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data).toEqual({
        error: 'Conflict',
        message: 'CUIT already registered',
      })
    })

    it('should return 400 Bad Request when body violates updateInsuredRequestSchema with invalid CUIT', async () => {
      const res = await app.request('/insureds/018f9e2b-1111-7000-8000-000000000001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuit: '20-12345678-9' }),
      })

      expect(res.status).toBe(400)
    })

    it('should return 400 Bad Request when body has invalid email', async () => {
      const res = await app.request('/insureds/018f9e2b-1111-7000-8000-000000000001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email-address' }),
      })

      expect(res.status).toBe(400)
    })

    it('should return 400 Bad Request when body has invalid phone format', async () => {
      const res = await app.request('/insureds/018f9e2b-1111-7000-8000-000000000001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '12' }),
      })

      expect(res.status).toBe(400)
    })

    it('should return 404 Not Found if insured to update does not exist', async () => {
      mockInsuredsService.updateProfile.mockResolvedValueOnce(null)

      const res = await app.request('/insureds/018f9e2b-9999-7000-8000-000000000009', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'NON EXISTENT' }),
      })

      expect(res.status).toBe(404)
    })
  })
})
