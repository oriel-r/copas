import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  insuredDetailResponseSchema,
  insuredResponseSchema,
  policiesDetailedResponseSchema,
  policyResponseSchema,
  installmentsDetailedResponseSchema,
  policyInstallmentResponseSchema,
  type InsuredDetailResponse,
  type InsuredResponse,
  type PoliciesDetailedResponse,
  type PolicyResponse,
  type InstallmentsDetailedResponse,
  type PolicyInstallmentResponse,
} from '@copas/contracts'

const mocks = vi.hoisted(() => ({
  createAuth: vi.fn(),
  getSession: vi.fn(),
  createInsuranceModule: vi.fn(),
  mockInsuredsService: {
    getDetailById: vi.fn(),
    updateProfile: vi.fn(),
    getById: vi.fn(),
  },
  mockPoliciesService: {
    getById: vi.fn(),
    listDetailed: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  mockInstallmentsService: {
    listInstallments: vi.fn(),
    updateStatus: vi.fn(),
    markAsPaid: vi.fn(),
    getById: vi.fn(),
  },
}))

vi.mock('../auth/auth.factory', () => ({
  createAuth: mocks.createAuth,
}))

vi.mock('./insurance.module', () => ({
  createInsuranceModule: mocks.createInsuranceModule,
}))

import app from '../../index'

// --- Test Constants & Identifiers ---

const TEST_ORG_ID = '018f9e2b-0000-7000-8000-000000000001'
const OTHER_ORG_ID = '018f9e2b-0000-7000-8000-000000000002'
const TEST_USER_ID = '018f9e2b-9999-7000-8000-000000000001'

const TEST_INSURED_ID = '018f9e2b-1111-7000-8000-000000000001'
const NON_EXISTENT_ID = '018f9e2b-9999-7000-8000-000000000999'

const TEST_COMPANY_ID_1 = '018f9e2b-3333-7000-8000-000000000001'
const TEST_COMPANY_ID_2 = '018f9e2b-3333-7000-8000-000000000002'
const TEST_BRANCH_ID_AUTO = '018f9e2b-4444-7000-8000-000000000001'
const TEST_BRANCH_ID_HOME = '018f9e2b-4444-7000-8000-000000000002'

const TEST_POLICY_ACTIVE_ID = '018f9e2b-2222-7000-8000-000000000001'
const TEST_POLICY_EXPIRED_ID = '018f9e2b-2222-7000-8000-000000000002'
const TEST_POLICY_CANCELLED_ID = '018f9e2b-2222-7000-8000-000000000003'

const TEST_INSTALLMENT_1_ID = '018f9e2b-5555-7000-8000-000000000001'
const TEST_INSTALLMENT_2_ID = '018f9e2b-5555-7000-8000-000000000002'
const TEST_INSTALLMENT_3_ID = '018f9e2b-5555-7000-8000-000000000003'

// --- Mock Domain Entities ---

const mockInsuredDetailFull: InsuredDetailResponse = {
  id: TEST_INSURED_ID,
  organizationId: TEST_ORG_ID,
  uploadedBy: TEST_USER_ID,
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
    id: TEST_POLICY_ACTIVE_ID,
    policyNumber: 'POL-AUTO-2026',
    companyId: TEST_COMPANY_ID_1,
    companyName: 'Federación Patronal',
    branchId: TEST_BRANCH_ID_AUTO,
    branchName: 'Automotores',
    assetDescription: 'Toyota Corolla 2022 (AB123CD)',
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    status: 'active',
  },
}

const mockInsuredUpdatedResponse: InsuredResponse = {
  id: TEST_INSURED_ID,
  organizationId: TEST_ORG_ID,
  uploadedBy: TEST_USER_ID,
  fullName: 'JUAN MANUEL PEREZ',
  cuit: '20-30000000-3',
  phone: '+541198765432',
  email: 'juan.updated@example.com',
  birthDate: '1985-05-22',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T10:00:00.000Z'),
  deletedAt: null,
}

const mockPoliciesDetailedList: PoliciesDetailedResponse = {
  total: 2,
  items: [
    {
      id: TEST_POLICY_ACTIVE_ID,
      policyNumber: 'POL-AUTO-2026',
      companyId: TEST_COMPANY_ID_1,
      companyName: 'Federación Patronal',
      branchId: TEST_BRANCH_ID_AUTO,
      branchName: 'Automotores',
      assetDescription: 'Toyota Corolla 2022 (AB123CD)',
      startDate: '2026-01-01',
      endDate: '2027-01-01',
      status: 'active',
      premiumTotal: 185000,
      currency: 'ARS',
      billingFrequency: 'monthly',
    },
    {
      id: TEST_POLICY_EXPIRED_ID,
      policyNumber: 'POL-HOME-2025',
      companyId: TEST_COMPANY_ID_2,
      companyName: 'Sancor Seguros',
      branchId: TEST_BRANCH_ID_HOME,
      branchName: 'Hogar',
      assetDescription: 'Casa Country - Lote 45',
      startDate: '2025-01-01',
      endDate: '2026-01-01',
      status: 'expired',
      premiumTotal: 95000,
      currency: 'ARS',
      billingFrequency: 'annual',
    },
  ],
}

const mockUpdatedPolicy: PolicyResponse = {
  id: TEST_POLICY_ACTIVE_ID,
  organizationId: TEST_ORG_ID,
  companyId: TEST_COMPANY_ID_1,
  insuredId: TEST_INSURED_ID,
  paymentMethodId: null,
  uploadedBy: TEST_USER_ID,
  producedBy: null,
  policyNumber: 'POL-AUTO-2026-MOD',
  premiumTotal: 210000,
  currency: 'ARS',
  startDate: '2026-01-01',
  endDate: '2027-01-01',
  effectiveEndDate: '2027-01-01',
  status: 'active',
  billingFrequency: 'monthly',
  documentUrl: 'https://r2.example.com/pol.pdf',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T12:00:00.000Z'),
  deletedAt: null,
}

const mockInstallmentsDetailedList: InstallmentsDetailedResponse = {
  appliedFilters: {
    dueDate: null,
    status: 'all',
    companyId: null,
    insuredId: null,
  },
  total: 3,
  items: [
    {
      installmentId: TEST_INSTALLMENT_1_ID,
      policyId: TEST_POLICY_ACTIVE_ID,
      insuredId: TEST_INSURED_ID,
      policyNumber: 'POL-AUTO-2026',
      installmentNumber: 1,
      insuredName: 'JUAN CARLOS PEREZ',
      companyName: 'Federación Patronal',
      assetDescription: 'Toyota Corolla 2022 (AB123CD)',
      totalAmount: 18500,
      currency: 'ARS',
      dueDate: '2026-01-15',
      status: 'paid',
    },
    {
      installmentId: TEST_INSTALLMENT_2_ID,
      policyId: TEST_POLICY_ACTIVE_ID,
      insuredId: TEST_INSURED_ID,
      policyNumber: 'POL-AUTO-2026',
      installmentNumber: 2,
      insuredName: 'JUAN CARLOS PEREZ',
      companyName: 'Federación Patronal',
      assetDescription: 'Toyota Corolla 2022 (AB123CD)',
      totalAmount: 18500,
      currency: 'ARS',
      dueDate: '2026-02-15',
      status: 'pending',
    },
    {
      installmentId: TEST_INSTALLMENT_3_ID,
      policyId: TEST_POLICY_ACTIVE_ID,
      insuredId: TEST_INSURED_ID,
      policyNumber: 'POL-AUTO-2026',
      installmentNumber: 3,
      insuredName: 'JUAN CARLOS PEREZ',
      companyName: 'Federación Patronal',
      assetDescription: 'Toyota Corolla 2022 (AB123CD)',
      totalAmount: 18500,
      currency: 'ARS',
      dueDate: '2026-03-15',
      status: 'overdue',
    },
  ],
}

const mockUpdatedInstallment: PolicyInstallmentResponse = {
  id: TEST_INSTALLMENT_2_ID,
  organizationId: TEST_ORG_ID,
  policyId: TEST_POLICY_ACTIVE_ID,
  uploadedBy: TEST_USER_ID,
  installmentNumber: 2,
  dueDate: '2026-02-15',
  totalAmount: 18500,
  currency: 'ARS',
  status: 'paid',
  receiptUrl: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-02-16T08:00:00.000Z'),
  deletedAt: null,
}

// --- Request Execution Helper ---

interface ApiRequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: unknown
  orgId?: string | null
  userId?: string
}

async function requestApi(path: string, options: ApiRequestOptions = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    orgId = TEST_ORG_ID,
    userId = TEST_USER_ID,
  } = options

  if (orgId !== null) {
    mocks.getSession.mockResolvedValue({
      session: { activeOrganizationId: orgId, userId },
      user: { id: userId, email: 'pas.operator@example.com' },
    })
  } else {
    mocks.getSession.mockResolvedValue(null)
  }

  const reqHeaders: Record<string, string> = { ...headers }
  let reqBody: string | undefined
  if (body !== undefined) {
    reqHeaders['Content-Type'] = 'application/json'
    reqBody = typeof body === 'string' ? body : JSON.stringify(body)
  }

  return app.request(
    path,
    {
      method,
      headers: reqHeaders,
      body: reqBody,
    },
    { DB: {} } as any,
  )
}

describe('Insured Detail Integration Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.createAuth.mockReturnValue({
      api: {
        getSession: mocks.getSession,
      },
    })

    mocks.createInsuranceModule.mockReturnValue({
      insureds: mocks.mockInsuredsService,
      insuredsService: mocks.mockInsuredsService,
      policies: mocks.mockPoliciesService,
      policiesService: mocks.mockPoliciesService,
      policyInstallments: mocks.mockInstallmentsService,
      policyInstallmentsService: mocks.mockInstallmentsService,
      installments: mocks.mockInstallmentsService,
      installmentsService: mocks.mockInstallmentsService,
    })
  })

  // =========================================================================
  // 1. Authentication & Multi-Tenancy Guardrails (401 & 404)
  // =========================================================================
  describe('1. Authentication & Multi-Tenancy Isolation Guardrails', () => {
    it.each([
      ['GET /insureds/:id', 'GET', `/insureds/${TEST_INSURED_ID}`, undefined],
      ['PATCH /insureds/:id', 'PATCH', `/insureds/${TEST_INSURED_ID}`, { fullName: 'TEST' }],
      ['GET /policies?insuredId=:id', 'GET', `/policies?insuredId=${TEST_INSURED_ID}`, undefined],
      ['PUT /policies/:id', 'PUT', `/policies/${TEST_POLICY_ACTIVE_ID}`, { status: 'active' }],
      ['PATCH /policies/:id', 'PATCH', `/policies/${TEST_POLICY_ACTIVE_ID}`, { status: 'active' }],
      ['GET /installments?policyId=:id', 'GET', `/installments?policyId=${TEST_POLICY_ACTIVE_ID}&status=all`, undefined],
      ['PATCH /installments/:id', 'PATCH', `/installments/${TEST_INSTALLMENT_1_ID}`, { status: 'paid' }],
    ])(
      'should return 401 Unauthorized on %s when request lacks active session/organizationId',
      async (_, method, path, body) => {
        const res = await requestApi(path, {
          method,
          orgId: null,
          body,
        })

        expect(res.status).toBe(401)
      },
    )

    it('should return 404 Not Found on GET /insureds/:id when insured belongs to another organization', async () => {
      // Service resolves null because the repository filters strictly by session active organization
      mocks.mockInsuredsService.getDetailById.mockResolvedValueOnce(null)

      const res = await requestApi(`/insureds/${TEST_INSURED_ID}`, {
        orgId: OTHER_ORG_ID,
      })

      expect(res.status).toBe(404)
    })

    it('should return 404 Not Found on GET /insureds/:id when insured does not exist or has deletedAt != null', async () => {
      mocks.mockInsuredsService.getDetailById.mockResolvedValueOnce(null)

      const res = await requestApi(`/insureds/${NON_EXISTENT_ID}`)

      expect(res.status).toBe(404)
    })

    it('should return 404 Not Found on PATCH /insureds/:id when insured to update does not exist', async () => {
      mocks.mockInsuredsService.updateProfile.mockResolvedValueOnce(null)

      const res = await requestApi(`/insureds/${NON_EXISTENT_ID}`, {
        method: 'PATCH',
        body: { fullName: 'NAME CHANGE' },
      })

      expect(res.status).toBe(404)
    })

    it('should return 404 Not Found on PUT /policies/:id when target policy does not exist', async () => {
      mocks.mockPoliciesService.update.mockResolvedValueOnce(null)

      const res = await requestApi(`/policies/${NON_EXISTENT_ID}`, {
        method: 'PUT',
        body: { status: 'cancelled' },
      })

      expect(res.status).toBe(404)
    })

    it('should return 404 Not Found on PATCH /policies/:id when target policy does not exist', async () => {
      mocks.mockPoliciesService.update.mockResolvedValueOnce(null)

      const res = await requestApi(`/policies/${NON_EXISTENT_ID}`, {
        method: 'PATCH',
        body: { status: 'cancelled' },
      })

      expect(res.status).toBe(404)
    })

    it('should return 404 Not Found on PATCH /installments/:id when target installment does not exist', async () => {
      mocks.mockInstallmentsService.updateStatus.mockResolvedValueOnce(null)
      mocks.mockInstallmentsService.markAsPaid.mockResolvedValueOnce(null)

      const res = await requestApi(`/installments/${NON_EXISTENT_ID}`, {
        method: 'PATCH',
        body: { status: 'paid' },
      })

      expect(res.status).toBe(404)
    })
  })

  // =========================================================================
  // 2. GET /insureds/:id (Insured Profile, Metrics & Latest Policy)
  // =========================================================================
  describe('2. GET /insureds/:id - Insured Profile, Metrics & Latest Policy', () => {
    it('should return 200 OK with payload conforming strictly to insuredDetailResponseSchema', async () => {
      mocks.mockInsuredsService.getDetailById.mockResolvedValueOnce(mockInsuredDetailFull)

      const res = await requestApi(`/insureds/${TEST_INSURED_ID}`)

      expect(res.status).toBe(200)
      const data = (await res.json()) as any

      const validation = insuredDetailResponseSchema.safeParse({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      })
      expect(validation.success).toBe(true)

      expect(data.id).toBe(TEST_INSURED_ID)
      expect(data.fullName).toBe('JUAN CARLOS PEREZ')
      expect(data.cuit).toBe('20-30000000-3')
      expect(data.phone).toBe('+541112345678')
      expect(data.email).toBe('juan.perez@example.com')
      expect(data.birthDate).toBe('1985-05-20')
      expect(data.activePoliciesCount).toBe(2)
      expect(data.totalPoliciesCount).toBe(3)
      expect(data.companies).toEqual(['Federación Patronal', 'Sancor Seguros'])

      expect(data.latestPolicy).not.toBeNull()
      expect(data.latestPolicy.id).toBe(TEST_POLICY_ACTIVE_ID)
      expect(data.latestPolicy.status).toBe('active')
      expect(data.latestPolicy.companyName).toBe('Federación Patronal')
      expect(data.latestPolicy.branchName).toBe('Automotores')
      expect(data.latestPolicy.assetDescription).toBe('Toyota Corolla 2022 (AB123CD)')

      expect(mocks.mockInsuredsService.getDetailById).toHaveBeenCalledWith(TEST_INSURED_ID)
    })

    it('should return 200 OK with zero metrics and null latestPolicy when insured has 0 policies', async () => {
      const zeroPoliciesDetail: InsuredDetailResponse = {
        ...mockInsuredDetailFull,
        activePoliciesCount: 0,
        totalPoliciesCount: 0,
        companies: [],
        latestPolicy: null,
      }
      mocks.mockInsuredsService.getDetailById.mockResolvedValueOnce(zeroPoliciesDetail)

      const res = await requestApi(`/insureds/${TEST_INSURED_ID}`)

      expect(res.status).toBe(200)
      const data = (await res.json()) as any

      const validation = insuredDetailResponseSchema.safeParse({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      })
      expect(validation.success).toBe(true)

      expect(data.activePoliciesCount).toBe(0)
      expect(data.totalPoliciesCount).toBe(0)
      expect(data.companies).toEqual([])
      expect(data.latestPolicy).toBeNull()
    })

    it('should return 200 OK with most recent historical policy when insured has only non-active policies', async () => {
      const historicalPoliciesDetail: InsuredDetailResponse = {
        ...mockInsuredDetailFull,
        activePoliciesCount: 0,
        totalPoliciesCount: 1,
        companies: ['Sancor Seguros'],
        latestPolicy: {
          id: TEST_POLICY_EXPIRED_ID,
          policyNumber: 'POL-HISTORICAL-2024',
          companyId: TEST_COMPANY_ID_2,
          companyName: 'Sancor Seguros',
          branchId: TEST_BRANCH_ID_HOME,
          branchName: 'Hogar',
          assetDescription: 'Casa Country - Lote 45',
          startDate: '2024-01-01',
          endDate: '2025-01-01',
          status: 'expired',
        },
      }
      mocks.mockInsuredsService.getDetailById.mockResolvedValueOnce(historicalPoliciesDetail)

      const res = await requestApi(`/insureds/${TEST_INSURED_ID}`)

      expect(res.status).toBe(200)
      const data = (await res.json()) as any

      const validation = insuredDetailResponseSchema.safeParse({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      })
      expect(validation.success).toBe(true)

      expect(data.activePoliciesCount).toBe(0)
      expect(data.totalPoliciesCount).toBe(1)
      expect(data.latestPolicy).not.toBeNull()
      expect(data.latestPolicy.status).toBe('expired')
      expect(data.latestPolicy.policyNumber).toBe('POL-HISTORICAL-2024')
    })
  })

  // =========================================================================
  // 3. PATCH /insureds/:id (Update Profile & CUIT Conflict)
  // =========================================================================
  describe('3. PATCH /insureds/:id - Profile Update & Fiscal ID Collision', () => {
    it('should return 200 OK with InsuredResponse when updating valid fields (fullName, phone, email, birthDate)', async () => {
      const updatePayload = {
        fullName: 'JUAN MANUEL PEREZ',
        phone: '+541198765432',
        email: 'juan.updated@example.com',
        birthDate: '1985-05-22',
      }
      mocks.mockInsuredsService.updateProfile.mockResolvedValueOnce(mockInsuredUpdatedResponse)

      const res = await requestApi(`/insureds/${TEST_INSURED_ID}`, {
        method: 'PATCH',
        body: updatePayload,
      })

      expect(res.status).toBe(200)
      const data = (await res.json()) as any

      const validation = insuredResponseSchema.safeParse({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      })
      expect(validation.success).toBe(true)

      expect(data.fullName).toBe('JUAN MANUEL PEREZ')
      expect(data.phone).toBe('+541198765432')
      expect(data.email).toBe('juan.updated@example.com')
      expect(data.birthDate).toBe('1985-05-22')

      expect(mocks.mockInsuredsService.updateProfile).toHaveBeenCalledWith(
        TEST_INSURED_ID,
        updatePayload,
      )
    })

    it('should return 200 OK when updating with the same CUIT already owned by the insured (no self-conflict)', async () => {
      const sameCuitPayload = { cuit: '20-30000000-3' }
      mocks.mockInsuredsService.updateProfile.mockResolvedValueOnce(mockInsuredUpdatedResponse)

      const res = await requestApi(`/insureds/${TEST_INSURED_ID}`, {
        method: 'PATCH',
        body: sameCuitPayload,
      })

      expect(res.status).toBe(200)
      expect(mocks.mockInsuredsService.updateProfile).toHaveBeenCalledWith(
        TEST_INSURED_ID,
        sameCuitPayload,
      )
    })

    it('should return 409 Conflict with standard message when CUIT already belongs to another insured in the organization', async () => {
      mocks.mockInsuredsService.updateProfile.mockRejectedValueOnce(
        new Error('CUIT already registered'),
      )

      const res = await requestApi(`/insureds/${TEST_INSURED_ID}`, {
        method: 'PATCH',
        body: { cuit: '27-30000000-8' },
      })

      expect(res.status).toBe(409)
      const body = (await res.json()) as any
      expect(body).toEqual({
        error: 'Conflict',
        message: 'CUIT already registered',
      })
    })

    it.each([
      ['malformed CUIT string', { cuit: '20-invalid-9' }],
      ['too short CUIT', { cuit: '123' }],
      ['invalid email address', { email: 'not-an-email' }],
      ['invalid phone number format', { phone: '12' }],
    ])('should return 400 Bad Request when payload contains %s', async (_, invalidPayload) => {
      const res = await requestApi(`/insureds/${TEST_INSURED_ID}`, {
        method: 'PATCH',
        body: invalidPayload,
      })

      expect(res.status).toBe(400)
    })
  })

  // =========================================================================
  // 4. GET /policies?insuredId=:id (Lazy Fetch Policies List)
  // =========================================================================
  describe('4. GET /policies?insuredId=:id - Lazy Fetch Policies List', () => {
    it('should return 200 OK with PoliciesDetailedResponse matching schema when filtering by insuredId', async () => {
      mocks.mockPoliciesService.listDetailed.mockResolvedValueOnce(mockPoliciesDetailedList)

      const res = await requestApi(`/policies?insuredId=${TEST_INSURED_ID}`)

      expect(res.status).toBe(200)
      const data = (await res.json()) as any

      const validation = policiesDetailedResponseSchema.safeParse(data)
      expect(validation.success).toBe(true)
      expect(data).toEqual(mockPoliciesDetailedList)
      expect(data.total).toBe(2)
      expect(data.items).toHaveLength(2)

      const firstItem = data.items[0]
      expect(firstItem.companyName).toBe('Federación Patronal')
      expect(firstItem.branchName).toBe('Automotores')
      expect(firstItem.assetDescription).toBe('Toyota Corolla 2022 (AB123CD)')

      expect(mocks.mockPoliciesService.listDetailed).toHaveBeenCalledWith(
        expect.objectContaining({
          insuredId: TEST_INSURED_ID,
        }),
      )
    })

    it('should correctly propagate pagination (limit, offset) and status filters to service', async () => {
      mocks.mockPoliciesService.listDetailed.mockResolvedValueOnce({ total: 0, items: [] })

      const res = await requestApi(
        `/policies?insuredId=${TEST_INSURED_ID}&status=active&limit=10&offset=5`,
      )

      expect(res.status).toBe(200)
      expect(mocks.mockPoliciesService.listDetailed).toHaveBeenCalledWith(
        expect.objectContaining({
          insuredId: TEST_INSURED_ID,
          status: 'active',
          limit: 10,
          offset: 5,
        }),
      )
    })

    it.each(['all', 'active', 'expired', 'canceled'] as const)(
      'should accept valid status filter="%s"',
      async (status) => {
        mocks.mockPoliciesService.listDetailed.mockResolvedValueOnce({ total: 0, items: [] })

        const res = await requestApi(
          `/policies?insuredId=${TEST_INSURED_ID}&status=${status}`,
        )

        expect(res.status).toBe(200)
      },
    )

    it('should return 200 OK with empty items list and total 0 when insured has no matching policies', async () => {
      mocks.mockPoliciesService.listDetailed.mockResolvedValueOnce({ total: 0, items: [] })

      const res = await requestApi(`/policies?insuredId=${TEST_INSURED_ID}&status=canceled`)

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(policiesDetailedResponseSchema.safeParse(data).success).toBe(true)
      expect(data.items).toEqual([])
      expect(data.total).toBe(0)
    })

    it.each(['unknown_status', 'cancelled', '123'])(
      'should return 400 Bad Request when status query parameter is invalid: "%s"',
      async (invalidStatus) => {
        const res = await requestApi(
          `/policies?insuredId=${TEST_INSURED_ID}&status=${invalidStatus}`,
        )

        expect(res.status).toBe(400)
      },
    )
  })

  // =========================================================================
  // 5. PUT & PATCH /policies/:id (Update Policy)
  // =========================================================================
  describe('5. PUT & PATCH /policies/:id - Update Policy Metadata, Status & Premium', () => {
    it('should return 200 OK with PolicyResponse via PUT after updating policy fields', async () => {
      const updatePayload = {
        policyNumber: 'POL-AUTO-2026-MOD',
        status: 'active',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        premiumTotal: 210000,
        currency: 'ARS',
      }
      mocks.mockPoliciesService.update.mockResolvedValueOnce(mockUpdatedPolicy)

      const res = await requestApi(`/policies/${TEST_POLICY_ACTIVE_ID}`, {
        method: 'PUT',
        body: updatePayload,
      })

      expect(res.status).toBe(200)
      const data = (await res.json()) as any

      const validation = policyResponseSchema.safeParse({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      })
      expect(validation.success).toBe(true)
      expect(data.policyNumber).toBe('POL-AUTO-2026-MOD')
      expect(data.premiumTotal).toBe(210000)

      expect(mocks.mockPoliciesService.update).toHaveBeenCalledWith(
        TEST_POLICY_ACTIVE_ID,
        expect.objectContaining(updatePayload),
      )
    })

    it('should return 200 OK with PolicyResponse via PATCH for partial policy updates', async () => {
      const patchPayload = { status: 'canceled' }
      const canceledPolicy = { ...mockUpdatedPolicy, status: 'canceled' }
      mocks.mockPoliciesService.update.mockResolvedValueOnce(canceledPolicy)

      const res = await requestApi(`/policies/${TEST_POLICY_ACTIVE_ID}`, {
        method: 'PATCH',
        body: patchPayload,
      })

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data.status).toBe('canceled')
      expect(mocks.mockPoliciesService.update).toHaveBeenCalledWith(
        TEST_POLICY_ACTIVE_ID,
        expect.objectContaining(patchPayload),
      )
    })

    it('should return 404 Not Found when updating policy that does not exist in organization', async () => {
      mocks.mockPoliciesService.update.mockResolvedValueOnce(null)

      const res = await requestApi(`/policies/${NON_EXISTENT_ID}`, {
        method: 'PUT',
        body: { status: 'active', premiumTotal: 100000 },
      })

      expect(res.status).toBe(404)
    })
  })

  // =========================================================================
  // 6. GET /installments?policyId=:id&status=all (Lazy Fetch Policy Installments)
  // =========================================================================
  describe('6. GET /installments?policyId=:id&status=all - Lazy Fetch Policy Installments', () => {
    it('should return 200 OK with InstallmentsDetailedResponse with all installments without limiting by today date', async () => {
      mocks.mockInstallmentsService.listInstallments.mockResolvedValueOnce(
        mockInstallmentsDetailedList,
      )

      const res = await requestApi(
        `/installments?policyId=${TEST_POLICY_ACTIVE_ID}&status=all`,
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as any

      const validation = installmentsDetailedResponseSchema.safeParse(data)
      expect(validation.success).toBe(true)
      expect(data).toEqual(mockInstallmentsDetailedList)
      expect(data.total).toBe(3)
      expect(data.items).toHaveLength(3)

      // Verify that all statuses (paid historical, pending current, overdue future) are returned
      const statuses = data.items.map((i: any) => i.status)
      expect(statuses).toContain('paid')
      expect(statuses).toContain('pending')
      expect(statuses).toContain('overdue')

      expect(mocks.mockInstallmentsService.listInstallments).toHaveBeenCalledWith(
        expect.objectContaining({
          policyId: TEST_POLICY_ACTIVE_ID,
          status: 'all',
          dueDate: undefined,
        }),
      )
    })

    it('should reject with 400 Bad Request when status query param is invalid', async () => {
      const res = await requestApi(
        `/installments?policyId=${TEST_POLICY_ACTIVE_ID}&status=invalid_status`,
      )

      expect(res.status).toBe(400)
    })

    it('should reject with 400 Bad Request when limit parameter is invalid or exceeds max 100', async () => {
      const res = await requestApi(
        `/installments?policyId=${TEST_POLICY_ACTIVE_ID}&limit=150`,
      )

      expect(res.status).toBe(400)
    })
  })

  // =========================================================================
  // 7. PATCH /installments/:id (Update Installment Status)
  // =========================================================================
  describe('7. PATCH /installments/:id - Installment Status Transition', () => {
    it('should return 200 OK when transitioning installment status from pending to paid', async () => {
      mocks.mockInstallmentsService.updateStatus.mockResolvedValueOnce(mockUpdatedInstallment)
      mocks.mockInstallmentsService.markAsPaid.mockResolvedValueOnce(mockUpdatedInstallment)

      const res = await requestApi(`/installments/${TEST_INSTALLMENT_2_ID}`, {
        method: 'PATCH',
        body: { status: 'paid' },
      })

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data.id).toBe(TEST_INSTALLMENT_2_ID)
      expect(data.status).toBe('paid')
    })

    it('should return 200 OK when reverting installment status from paid to pending', async () => {
      const pendingInstallment = { ...mockUpdatedInstallment, status: 'pending' }
      mocks.mockInstallmentsService.updateStatus.mockResolvedValueOnce(pendingInstallment)

      const res = await requestApi(`/installments/${TEST_INSTALLMENT_2_ID}`, {
        method: 'PATCH',
        body: { status: 'pending' },
      })

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data.status).toBe('pending')
      expect(mocks.mockInstallmentsService.updateStatus).toHaveBeenCalledWith(
        TEST_INSTALLMENT_2_ID,
        'pending',
      )
    })

    it('should return 200 OK when transitioning installment status to overdue', async () => {
      const overdueInstallment = { ...mockUpdatedInstallment, status: 'overdue' }
      mocks.mockInstallmentsService.updateStatus.mockResolvedValueOnce(overdueInstallment)

      const res = await requestApi(`/installments/${TEST_INSTALLMENT_3_ID}`, {
        method: 'PATCH',
        body: { status: 'overdue' },
      })

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data.status).toBe('overdue')
    })

    it('should return 400 Bad Request when request body is empty or lacks status field', async () => {
      const res = await requestApi(`/installments/${TEST_INSTALLMENT_2_ID}`, {
        method: 'PATCH',
        body: {},
      })

      expect(res.status).toBe(400)
    })

    it('should return 400 Bad Request when status value is not a valid installment status', async () => {
      const res = await requestApi(`/installments/${TEST_INSTALLMENT_2_ID}`, {
        method: 'PATCH',
        body: { status: 'cancelled' },
      })

      expect(res.status).toBe(400)
    })
  })
})
