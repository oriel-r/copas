import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import {
  getOrganizationWhatsAppEndpointResponseSchema,
  upsertOrganizationWhatsAppEndpointRequestSchema,
  type OrganizationWhatsAppEndpoint,
} from '@copas/contracts'
import { createChannelEndpointsRouter } from './channel-endpoints.routes'
import { createChannelEndpointsService } from './channel-endpoints.service'

const makeWhatsAppEndpoint = (
  overrides: Partial<OrganizationWhatsAppEndpoint> = {},
): OrganizationWhatsAppEndpoint => ({
  endpointId: 'cep-org-1',
  organizationChannelEndpointId: 'oce-org-1',
  organizationId: 'org-123',
  number: '+54 9 11 1234-5678',
  provider: 'whatsapp_cloud',
  ownerKind: 'organization',
  status: 'inactive',
  linkingStatus: 'suspended',
  ...overrides,
})

describe('channel-endpoints.routes', () => {
  let mockService: {
    getOrganizationWhatsAppEndpoint: ReturnType<typeof vi.fn>
    upsertOrganizationWhatsAppEndpoint: ReturnType<typeof vi.fn>
  }

  const setupApp = (options: { orgId?: string | null; omitOrgId?: boolean } = {}) => {
    const testApp = new Hono()

    testApp.use('*', async (c, next) => {
      if (!options.omitOrgId) {
        c.set('organizationId' as any, options.orgId !== undefined ? options.orgId : 'org-123')
      }
      c.set('channelEndpointsService' as any, mockService)
      c.set('services' as any, {
        channelEndpoints: mockService,
        channelEndpointsService: mockService,
        communications: {
          channelEndpoints: mockService,
          channelEndpointsService: mockService,
        },
      })
      await next()
    })

    const router = createChannelEndpointsRouter({
      channelEndpointsService: mockService as any,
    })
    testApp.route('/channel-endpoints', router)
    return testApp
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockService = {
      getOrganizationWhatsAppEndpoint: vi.fn(),
      upsertOrganizationWhatsAppEndpoint: vi.fn(),
    }
  })

  describe('GET /whatsapp', () => {
    it('returns 401 when organizationId is null in Hono context', async () => {
      const app = setupApp({ orgId: null })

      const res = await app.request('/channel-endpoints/whatsapp')

      expect(res.status).toBe(401)
      expect(mockService.getOrganizationWhatsAppEndpoint).not.toHaveBeenCalled()
    })

    it('returns 401 when organizationId is not set in Hono context', async () => {
      const app = setupApp({ omitOrgId: true })

      const res = await app.request('/channel-endpoints/whatsapp')

      expect(res.status).toBe(401)
      expect(mockService.getOrganizationWhatsAppEndpoint).not.toHaveBeenCalled()
    })

    it('returns 200 with { endpoint: null } when organization has no WhatsApp endpoint', async () => {
      mockService.getOrganizationWhatsAppEndpoint.mockResolvedValueOnce(null)
      const app = setupApp({ orgId: 'org-123' })

      const res = await app.request('/channel-endpoints/whatsapp')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ endpoint: null })
      expect(getOrganizationWhatsAppEndpointResponseSchema.safeParse(body).success).toBe(true)
      expect(mockService.getOrganizationWhatsAppEndpoint).toHaveBeenCalledWith('org-123')
    })

    it('returns 200 with { endpoint } when service returns an OrganizationWhatsAppEndpoint', async () => {
      const endpoint = makeWhatsAppEndpoint({ status: 'active', linkingStatus: 'active' })
      mockService.getOrganizationWhatsAppEndpoint.mockResolvedValueOnce(endpoint)
      const app = setupApp({ orgId: 'org-123' })

      const res = await app.request('/channel-endpoints/whatsapp')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ endpoint })
      expect(getOrganizationWhatsAppEndpointResponseSchema.safeParse(body).success).toBe(true)
      expect(mockService.getOrganizationWhatsAppEndpoint).toHaveBeenCalledWith('org-123')
    })
  })

  describe('PUT /whatsapp', () => {
    it('returns 401 when organizationId is null in Hono context', async () => {
      const app = setupApp({ orgId: null })

      const res = await app.request('/channel-endpoints/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: '+54 9 11 1234-5678' }),
      })

      expect(res.status).toBe(401)
      expect(mockService.upsertOrganizationWhatsAppEndpoint).not.toHaveBeenCalled()
    })

    it('returns 401 when organizationId is omitted from Hono context', async () => {
      const app = setupApp({ omitOrgId: true })

      const res = await app.request('/channel-endpoints/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: '+54 9 11 1234-5678' }),
      })

      expect(res.status).toBe(401)
      expect(mockService.upsertOrganizationWhatsAppEndpoint).not.toHaveBeenCalled()
    })

    it.each([
      ['empty object', {}],
      ['empty number string', { number: '' }],
      ['whitespace-only number string', { number: '   ' }],
      ['non-phone letters', { number: 'abc' }],
      ['incomplete +54 9 prefix (+54 9 12)', { number: '+54 9 12' }],
      ['too short +54 9 subscriber (5 digits)', { number: '+54 9 12345' }],
      ['non-string number', { number: 5491112345678 }],
    ])('returns 400 when payload is invalid (%s)', async (_label, invalidPayload) => {
      expect(upsertOrganizationWhatsAppEndpointRequestSchema.safeParse(invalidPayload).success).toBe(false)
      const app = setupApp({ orgId: 'org-123' })

      const res = await app.request('/channel-endpoints/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })

      expect(res.status).toBe(400)
      expect(mockService.upsertOrganizationWhatsAppEndpoint).not.toHaveBeenCalled()
    })

    it('returns 200 with { endpoint } on valid payload and passes trimmed number and organizationId to service', async () => {
      const endpoint = makeWhatsAppEndpoint({
        organizationId: 'org-123',
        number: '+54 9 11 1234-5678',
        status: 'inactive',
        linkingStatus: 'suspended',
      })
      mockService.upsertOrganizationWhatsAppEndpoint.mockResolvedValueOnce(endpoint)
      const app = setupApp({ orgId: 'org-123' })

      const res = await app.request('/channel-endpoints/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: '  +54 9 11 1234-5678  ' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ endpoint })
      expect(getOrganizationWhatsAppEndpointResponseSchema.safeParse(body).success).toBe(true)
      expect(mockService.upsertOrganizationWhatsAppEndpoint).toHaveBeenCalledOnce()
      expect(mockService.upsertOrganizationWhatsAppEndpoint).toHaveBeenCalledWith(
        '+54 9 11 1234-5678',
        'org-123',
      )
    })

    it('accepts boundary +54 9 number with exactly 6 subscriber digits', async () => {
      const endpoint = makeWhatsAppEndpoint({
        organizationId: 'org-123',
        number: '+54 9 123456',
      })
      mockService.upsertOrganizationWhatsAppEndpoint.mockResolvedValueOnce(endpoint)
      const app = setupApp({ orgId: 'org-123' })

      const res = await app.request('/channel-endpoints/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: '+54 9 123456' }),
      })

      expect(res.status).toBe(200)
      expect(mockService.upsertOrganizationWhatsAppEndpoint).toHaveBeenCalledWith(
        '+54 9 123456',
        'org-123',
      )
    })
  })
})

describe('channel-endpoints.service - organization WhatsApp endpoint', () => {
  let mockRepo: any
  let service: ReturnType<typeof createChannelEndpointsService>

  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo = {
      findPrimaryByOrganization: vi.fn(),
      findPlatformFallback: vi.fn(),
      findById: vi.fn(),
      findOrganizationWhatsAppEndpoint: vi.fn(),
      upsertOrganizationWhatsAppEndpoint: vi.fn(),
    }
    service = createChannelEndpointsService({ channelEndpointsRepository: mockRepo } as any)
  })

  describe('getOrganizationWhatsAppEndpoint', () => {
    it('delegates to repository and returns null when none exists', async () => {
      mockRepo.findOrganizationWhatsAppEndpoint.mockResolvedValueOnce(null)

      const result = await service.getOrganizationWhatsAppEndpoint('org-123')

      expect(result).toBeNull()
      expect(mockRepo.findOrganizationWhatsAppEndpoint).toHaveBeenCalledWith('org-123')
    })

    it('delegates to repository and returns OrganizationWhatsAppEndpoint when found', async () => {
      const endpoint = makeWhatsAppEndpoint({ organizationId: 'org-123', status: 'active' })
      mockRepo.findOrganizationWhatsAppEndpoint.mockResolvedValueOnce(endpoint)

      const result = await service.getOrganizationWhatsAppEndpoint('org-123')

      expect(result).toEqual(endpoint)
      expect(mockRepo.findOrganizationWhatsAppEndpoint).toHaveBeenCalledWith('org-123')
    })
  })

  describe('upsertOrganizationWhatsAppEndpoint', () => {
    it.each([
      ['empty string', ''],
      ['whitespace only', '   '],
    ])('rejects %s phone number without delegating to repository', async (_label, invalidNumber) => {
      await expect(
        service.upsertOrganizationWhatsAppEndpoint(invalidNumber, 'org-123'),
      ).rejects.toThrow()

      expect(mockRepo.upsertOrganizationWhatsAppEndpoint).not.toHaveBeenCalled()
    })

    it('trims phone number and delegates to repository', async () => {
      const saved = makeWhatsAppEndpoint({
        organizationId: 'org-123',
        number: '+54 9 11 1234-5678',
      })
      mockRepo.upsertOrganizationWhatsAppEndpoint.mockResolvedValueOnce(saved)

      const result = await service.upsertOrganizationWhatsAppEndpoint(
        '  +54 9 11 1234-5678  ',
        'org-123',
      )

      expect(result).toEqual(saved)
      expect(mockRepo.upsertOrganizationWhatsAppEndpoint).toHaveBeenCalledWith(
        '+54 9 11 1234-5678',
        'org-123',
      )
    })
  })
})
