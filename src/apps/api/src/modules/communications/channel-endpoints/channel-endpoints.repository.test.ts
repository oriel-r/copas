import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChannelEndpointsRepository } from './channel-endpoints.repository'

const { mockDrizzle } = vi.hoisted(() => ({
  mockDrizzle: vi.fn((d1: any) => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    limit: vi.fn().mockResolvedValue([]),
    _drizzleWrapped: true,
    _rawD1: d1,
  })),
}))

vi.mock('drizzle-orm/d1', () => ({
  drizzle: mockDrizzle,
}))

describe('channel-endpoints.repository', () => {
  let mockDb: any
  let repository: ReturnType<typeof createChannelEndpointsRepository>

  beforeEach(() => {
    mockDrizzle.mockClear()
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
      limit: vi.fn().mockResolvedValue([]),
    }
    repository = createChannelEndpointsRepository({ db: mockDb, organizationId: 'org-1' } as any)
  })

  describe('D1 vs Drizzle wrapping', () => {
    it('should wrap D1 database with drizzle lazily when db.prepare is a function', async () => {
      const mockD1 = { prepare: vi.fn() }
      const repo = createChannelEndpointsRepository({ db: mockD1, organizationId: 'org-1' } as any)
      await repo.findPrimaryByOrganization('org-1')
      expect(mockDrizzle).toHaveBeenCalledWith(mockD1)
    })

    it('should wrap tx with drizzle if tx has prepare function', async () => {
      const mockTx = { prepare: vi.fn() }
      await repository.findPrimaryByOrganization('org-1', mockTx as any)
      expect(mockDrizzle).toHaveBeenCalledWith(mockTx)
    })
  })

  describe('findPrimaryWhatsAppEndpoint', () => {
    it('should return primary active WhatsApp endpoint with parsed object credentials', async () => {
      const endpointRow = {
        organizationChannelEndpointId: 'oce-1',
        endpointId: 'cep-1',
        phoneNumberId: 'phone-123',
        number: '+5491122223333',
        provider: 'whatsapp',
        ownerKind: 'organization',
        credentials: { accessToken: 'token-obj', wabaId: 'waba-1' },
      }
      mockDb.orderBy.mockResolvedValueOnce([endpointRow])

      const result = await repository.findPrimaryWhatsAppEndpoint()
      expect(result).toEqual({
        organizationChannelEndpointId: 'oce-1',
        endpointId: 'cep-1',
        phoneNumberId: 'phone-123',
        number: '+5491122223333',
        provider: 'whatsapp',
        ownerKind: 'organization',
        credentials: { accessToken: 'token-obj', wabaId: 'waba-1' },
      })
      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should parse JSON string credentials if credentials is a string', async () => {
      const endpointRow = {
        organizationChannelEndpointId: 'oce-1',
        endpointId: 'cep-1',
        phoneNumberId: 'phone-123',
        number: '+5491122223333',
        provider: 'whatsapp',
        ownerKind: 'organization',
        credentials: JSON.stringify({ accessToken: 'token-str', wabaId: 'waba-str' }),
      }
      mockDb.orderBy.mockResolvedValueOnce([endpointRow])

      const result = await repository.findPrimaryWhatsAppEndpoint()
      expect(result?.credentials).toEqual({ accessToken: 'token-str', wabaId: 'waba-str' })
    })

    it('should return null when no primary WhatsApp endpoint is found', async () => {
      mockDb.orderBy.mockResolvedValueOnce([])

      const result = await repository.findPrimaryWhatsAppEndpoint()
      expect(result).toBeNull()
    })

    it('should propagate tx in findPrimaryWhatsAppEndpoint if provided', async () => {
      const endpointRow = {
        organizationChannelEndpointId: 'oce-tx',
        endpointId: 'cep-tx',
        phoneNumberId: null,
        number: null,
        provider: 'whatsapp',
        ownerKind: 'organization',
        credentials: { accessToken: 'token-tx' },
      }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValueOnce([endpointRow]),
      }

      const result = await repository.findPrimaryWhatsAppEndpoint(mockTx as any)
      expect(result?.endpointId).toBe('cep-tx')
      expect(result?.phoneNumberId).toBeUndefined()
      expect(result?.number).toBeUndefined()
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('findPrimaryByOrganization', () => {
    it('should return primary active channel endpoint with joined credentials', async () => {
      const mockEndpointRow = {
        endpointId: 'cep-1',
        phoneNumberId: 'phone-123',
        provider: 'meta_cloud_api',
        ownerKind: 'organization',
        number: '+5491122223333',
        credentials: { accessToken: 'EAAB_token', wabaId: 'waba-123' },
        organizationChannelEndpointId: 'oce-1',
      }
      mockDb.orderBy.mockResolvedValueOnce([mockEndpointRow])

      const result = await repository.findPrimaryByOrganization('org-1')

      expect(result).toEqual(mockEndpointRow)
      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
      expect(mockDb.orderBy).toHaveBeenCalled()
    })

    it('should return null when no primary active endpoint is found for organization', async () => {
      mockDb.orderBy.mockResolvedValueOnce([])

      const result = await repository.findPrimaryByOrganization('org-not-found')

      expect(result).toBeNull()
    })

    it('should use transaction tx in findPrimaryByOrganization if provided', async () => {
      const mockEndpointRow = {
        endpointId: 'cep-tx',
        phoneNumberId: 'phone-tx',
        provider: 'meta_cloud_api',
        ownerKind: 'organization',
        number: '+5491100001111',
        credentials: { accessToken: 'EAAB_tx_token', wabaId: 'waba-tx' },
        organizationChannelEndpointId: 'oce-tx',
      }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValueOnce([mockEndpointRow]),
      }

      const result = await repository.findPrimaryByOrganization('org-1', mockTx as any)

      expect(result).toEqual(mockEndpointRow)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('findPlatformFallback', () => {
    it('should return platform fallback endpoint where ownerKind is platform', async () => {
      const mockPlatformRow = {
        endpointId: 'cep-plat-1',
        phoneNumberId: 'phone-platform',
        provider: 'meta_cloud_api',
        ownerKind: 'platform',
        number: '+5491199990000',
        credentials: { accessToken: 'EAAB_platform_token', wabaId: 'waba-platform' },
        organizationChannelEndpointId: null,
      }
      mockDb.orderBy.mockResolvedValueOnce([mockPlatformRow])

      const result = await repository.findPlatformFallback('whatsapp')

      expect(result).toEqual(mockPlatformRow)
      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
      expect(mockDb.orderBy).toHaveBeenCalled()
    })

    it('should return null when no platform fallback endpoint exists', async () => {
      mockDb.orderBy.mockResolvedValueOnce([])

      const result = await repository.findPlatformFallback('whatsapp')

      expect(result).toBeNull()
    })

    it('should use transaction tx in findPlatformFallback if provided', async () => {
      const mockPlatformRow = {
        endpointId: 'cep-plat-tx',
        phoneNumberId: 'phone-plat-tx',
        provider: 'meta_cloud_api',
        ownerKind: 'platform',
        number: '+5491188887777',
        credentials: { accessToken: 'EAAB_plat_tx', wabaId: 'waba-plat-tx' },
        organizationChannelEndpointId: null,
      }
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValueOnce([mockPlatformRow]),
      }

      const result = await repository.findPlatformFallback('whatsapp', mockTx as any)

      expect(result).toEqual(mockPlatformRow)
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('findOrganizationWhatsAppEndpoint', () => {
    beforeEach(() => {
      mockDb.orderBy = vi.fn().mockReturnThis()
    })

    it('returns null without querying when organizationId is empty', async () => {
      const repo = createChannelEndpointsRepository({ db: mockDb, organizationId: '' } as any)

      const result = await repo.findOrganizationWhatsAppEndpoint('')

      expect(result).toBeNull()
      expect(mockDb.select).not.toHaveBeenCalled()
    })

    it('returns null when no organization WhatsApp endpoint row exists', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await repository.findOrganizationWhatsAppEndpoint('org-1')

      expect(result).toBeNull()
      expect(mockDb.select).toHaveBeenCalled()
    })

    it('returns mapped OrganizationWhatsAppEndpoint when present', async () => {
      const row = {
        endpointId: 'cep-org-1',
        organizationChannelEndpointId: 'oce-org-1',
        organizationId: 'org-1',
        number: '+54 9 11 1234-5678',
        provider: 'whatsapp_cloud',
        ownerKind: 'organization',
        status: 'active',
        linkingStatus: 'active',
        connectionStatus: 'connected',
      }
      mockDb.limit.mockResolvedValueOnce([row])

      const result = await repository.findOrganizationWhatsAppEndpoint('org-1')

      expect(result).toEqual({
        endpointId: 'cep-org-1',
        organizationChannelEndpointId: 'oce-org-1',
        organizationId: 'org-1',
        number: '+54 9 11 1234-5678',
        provider: 'whatsapp_cloud',
        ownerKind: 'organization',
        status: 'active',
        linkingStatus: 'active',
        connectionStatus: 'connected',
      })
    })

    it('defaults linkingStatus to "suspended" and connectionStatus to null when left-join link is null', async () => {
      const row = {
        endpointId: 'cep-org-1',
        organizationChannelEndpointId: null,
        organizationId: 'org-1',
        number: '+54 9 11 1234-5678',
        provider: 'whatsapp_cloud',
        ownerKind: 'organization',
        status: 'inactive',
        linkingStatus: null,
        connectionStatus: null,
      }
      mockDb.limit.mockResolvedValueOnce([row])

      const result = await repository.findOrganizationWhatsAppEndpoint('org-1')

      expect(result).toEqual({
        endpointId: 'cep-org-1',
        organizationChannelEndpointId: null,
        organizationId: 'org-1',
        number: '+54 9 11 1234-5678',
        provider: 'whatsapp_cloud',
        ownerKind: 'organization',
        status: 'inactive',
        linkingStatus: 'suspended',
        connectionStatus: null,
      })
    })
  })

  describe('upsertOrganizationWhatsAppEndpoint', () => {
    beforeEach(() => {
      mockDb.orderBy = vi.fn().mockReturnThis()
      mockDb.insert = vi.fn().mockReturnThis()
      mockDb.values = vi.fn().mockReturnThis()
      mockDb.onConflictDoNothing = vi.fn().mockReturnThis()
      mockDb.returning = vi.fn().mockResolvedValue([])
      mockDb.update = vi.fn().mockReturnThis()
      mockDb.set = vi.fn().mockReturnThis()
    })

    it('throws "Organization required" when orgId is empty', async () => {
      const repo = createChannelEndpointsRepository({ db: mockDb, organizationId: '' } as any)

      await expect(
        repo.upsertOrganizationWhatsAppEndpoint('+54 9 11 1234-5678', ''),
      ).rejects.toThrow('Organization required')
    })

    it('inserts fallback "chn_whatsapp" channel and creates organization_channels, channel_endpoints, and organization_channel_endpoints when missing', async () => {
      const createdEndpoint = {
        endpointId: 'cep-new',
        organizationChannelEndpointId: 'oce-new',
        organizationId: 'org-1',
        number: '+54 9 11 1234-5678',
        provider: 'whatsapp_cloud',
        ownerKind: 'organization',
        status: 'inactive',
        linkingStatus: 'suspended',
        connectionStatus: null,
      }
      mockDb.limit
        .mockResolvedValueOnce([]) // channel lookup
        .mockResolvedValueOnce([]) // organization_channel lookup
        .mockResolvedValueOnce([]) // existing endpoint lookup
      mockDb.returning
        .mockResolvedValueOnce([{ id: 'och-new', organizationId: 'org-1', channelId: 'chn_whatsapp' }])
        .mockResolvedValueOnce([
          {
            id: 'cep-new',
            channelId: 'chn_whatsapp',
            number: '+54 9 11 1234-5678',
            provider: 'whatsapp_cloud',
            ownerKind: 'organization',
            ownerOrganizationId: 'org-1',
            status: 'inactive',
          },
        ])
        .mockResolvedValueOnce([{ id: 'oce-new', status: 'suspended', isPrimary: false }])

      const result = await repository.upsertOrganizationWhatsAppEndpoint(
        '+54 9 11 1234-5678',
        'org-1',
      )

      expect(result).toEqual(createdEndpoint)

      const insertedValues = mockDb.values.mock.calls.map(([arg]: [any]) => arg)
      expect(insertedValues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'chn_whatsapp', code: 'whatsapp' }),
          expect.objectContaining({
            organizationId: 'org-1',
            channelId: 'chn_whatsapp',
            isEnabled: false,
            config: null,
          }),
          expect.objectContaining({
            channelId: 'chn_whatsapp',
            number: '+54 9 11 1234-5678',
            provider: 'whatsapp_cloud',
            ownerKind: 'organization',
            ownerOrganizationId: 'org-1',
            status: 'inactive',
          }),
          expect.objectContaining({
            isPrimary: false,
            status: 'suspended',
          }),
        ]),
      )
    })

    it('updates an existing endpoint without resetting status when number is unchanged', async () => {
      const unchangedEndpoint = {
        endpointId: 'cep-1',
        organizationChannelEndpointId: 'oce-1',
        organizationId: 'org-1',
        number: '+54 9 11 1234-5678',
        provider: 'whatsapp_cloud',
        ownerKind: 'organization',
        status: 'active',
        linkingStatus: 'active',
        connectionStatus: null,
      }
      mockDb.limit
        .mockResolvedValueOnce([{ id: 'chn_whatsapp' }]) // channel
        .mockResolvedValueOnce([{ id: 'och-1' }]) // organization_channel
        .mockResolvedValueOnce([{ id: 'cep-1', number: '+54 9 11 1234-5678', status: 'active' }]) // existing endpoint
        .mockResolvedValueOnce([{ id: 'oce-1', status: 'active', isPrimary: true }]) // existing link
        .mockResolvedValueOnce([unchangedEndpoint]) // final read

      const result = await repository.upsertOrganizationWhatsAppEndpoint(
        '+54 9 11 1234-5678',
        'org-1',
      )

      expect(result).toEqual(unchangedEndpoint)

      const setPayloads = mockDb.set.mock.calls.map(([arg]: [any]) => arg)
      expect(setPayloads.some((p: any) => p.status === 'inactive')).toBe(false)
      expect(setPayloads.some((p: any) => p.status === 'suspended')).toBe(false)
    })

    it('updates existing endpoint and resets status to "inactive" and active link to "suspended", isPrimary: false when number changes', async () => {
      const resetEndpoint = {
        endpointId: 'cep-1',
        organizationChannelEndpointId: 'oce-1',
        organizationId: 'org-1',
        number: '+54 9 11 9999-0000',
        provider: 'whatsapp_cloud',
        ownerKind: 'organization',
        status: 'inactive',
        linkingStatus: 'suspended',
        connectionStatus: null,
      }
      mockDb.limit
        .mockResolvedValueOnce([{ id: 'chn_whatsapp' }]) // channel
        .mockResolvedValueOnce([{ id: 'och-1' }]) // organization_channel
        .mockResolvedValueOnce([{ id: 'cep-1', number: '+54 9 11 1234-5678', status: 'active' }]) // existing endpoint
        .mockResolvedValueOnce([{ id: 'oce-1', status: 'active', isPrimary: true }]) // existing link
        .mockResolvedValueOnce([resetEndpoint]) // final read

      const result = await repository.upsertOrganizationWhatsAppEndpoint(
        '+54 9 11 9999-0000',
        'org-1',
      )

      expect(result).toEqual(resetEndpoint)

      const setPayloads = mockDb.set.mock.calls.map(([arg]: [any]) => arg)
      expect(setPayloads).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ number: '+54 9 11 9999-0000', status: 'inactive' }),
          expect.objectContaining({ status: 'suspended', isPrimary: false }),
        ]),
      )
    })

    it('creates missing organization_channel_endpoints link if existing endpoint has none', async () => {
      const linkedEndpoint = {
        endpointId: 'cep-1',
        organizationChannelEndpointId: 'oce-new',
        organizationId: 'org-1',
        number: '+54 9 11 1234-5678',
        provider: 'whatsapp_cloud',
        ownerKind: 'organization',
        status: 'inactive',
        linkingStatus: 'suspended',
        connectionStatus: null,
      }
      mockDb.limit
        .mockResolvedValueOnce([{ id: 'chn_whatsapp' }]) // channel
        .mockResolvedValueOnce([{ id: 'och-1' }]) // organization_channel
        .mockResolvedValueOnce([{ id: 'cep-1', number: '+54 9 11 1234-5678', status: 'inactive' }]) // existing endpoint
        .mockResolvedValueOnce([]) // missing link
      mockDb.returning
        .mockResolvedValueOnce([
          {
            id: 'cep-1',
            number: '+54 9 11 1234-5678',
            provider: 'whatsapp_cloud',
            ownerKind: 'organization',
            ownerOrganizationId: 'org-1',
            status: 'inactive',
          },
        ])
        .mockResolvedValueOnce([{ id: 'oce-new', status: 'suspended', isPrimary: false }])

      const result = await repository.upsertOrganizationWhatsAppEndpoint(
        '+54 9 11 1234-5678',
        'org-1',
      )

      expect(result).toEqual(linkedEndpoint)

      const insertedValues = mockDb.values.mock.calls.map(([arg]: [any]) => arg)
      expect(insertedValues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            organizationChannelId: 'och-1',
            endpointId: 'cep-1',
            isPrimary: false,
            status: 'suspended',
          }),
        ]),
      )
    })
  })

  describe('applyWhatsAppConnectionStatusByPhone', () => {
    beforeEach(() => {
      mockDb.orderBy = vi.fn().mockReturnThis()
      mockDb.insert = vi.fn().mockReturnThis()
      mockDb.values = vi.fn().mockReturnThis()
      mockDb.onConflictDoNothing = vi.fn().mockReturnThis()
      mockDb.returning = vi.fn().mockResolvedValue([])
      mockDb.update = vi.fn().mockReturnThis()
      mockDb.set = vi.fn().mockReturnThis()
    })

    it('returns null without mutating state when no matching organization whatsapp_cloud endpoint exists', async () => {
      mockDb.orderBy.mockResolvedValueOnce([
        {
          id: 'cep-other',
          channelId: 'chn_whatsapp',
          number: '+54 9 11 9999-8888',
          ownerOrganizationId: 'org-other',
        },
      ])

      const result = await repository.applyWhatsAppConnectionStatusByPhone({
        phoneNumber: '+54 9 11 1234-5678',
        phoneNumberId: 'phone-id-1',
        connectionStatus: 'connected',
      })

      expect(result).toBeNull()
      expect(mockDb.update).not.toHaveBeenCalled()
      expect(mockDb.insert).not.toHaveBeenCalled()
    })

    it('returns null when phoneNumber has no digits', async () => {
      const result = await repository.applyWhatsAppConnectionStatusByPhone({
        phoneNumber: '---',
        connectionStatus: 'connected',
      })

      expect(result).toBeNull()
      expect(mockDb.select).not.toHaveBeenCalled()
    })

    it('matches Argentine 549... / 54... digit candidates and activates endpoint, link, channel, and upserts integration on "connected"', async () => {
      const updatedEndpoint = {
        endpointId: 'cep-1',
        organizationChannelEndpointId: 'oce-1',
        organizationId: 'org-1',
        number: '+54 9 11 1234-5678',
        provider: 'whatsapp_cloud',
        ownerKind: 'organization',
        status: 'active',
        linkingStatus: 'active',
        connectionStatus: 'connected',
      }

      // 1. Candidate organization endpoints query (.where().orderBy())
      mockDb.orderBy.mockResolvedValueOnce([
        {
          id: 'cep-1',
          channelId: 'chn_whatsapp',
          number: '+54 9 11 1234-5678',
          ownerOrganizationId: 'org-1',
        },
      ])
      // 2. Subsequent queries use .limit(1):
      //    channels -> organization_channels -> link -> organization_integrations -> final read
      mockDb.limit
        .mockResolvedValueOnce([{ id: 'chn_whatsapp' }])
        .mockResolvedValueOnce([{ id: 'och-1', organizationId: 'org-1', channelId: 'chn_whatsapp' }])
        .mockResolvedValueOnce([
          { id: 'oce-1', status: 'suspended', isPrimary: false, assignedAt: null },
        ])
        .mockResolvedValueOnce([]) // organization_integrations (missing -> insert)
        .mockResolvedValueOnce([updatedEndpoint])

      const result = await repository.applyWhatsAppConnectionStatusByPhone({
        // 5411... without the mobile '9' must match '+54 9 11 1234-5678'
        phoneNumber: '541112345678',
        phoneNumberId: 'waha-phone-id-1',
        connectionStatus: 'connected',
      })

      const setPayloads = mockDb.set.mock.calls.map(([arg]: [any]) => arg)
      expect(setPayloads).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 'active', connectionStatus: 'connected' }),
          expect.objectContaining({ status: 'suspended', isPrimary: false }),
          expect.objectContaining({ status: 'active', isPrimary: true }),
          expect.objectContaining({ isEnabled: true }),
        ]),
      )

      const insertedValues = mockDb.values.mock.calls.map(([arg]: [any]) => arg)
      expect(insertedValues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            organizationId: 'org-1',
            provider: 'whatsapp_cloud',
            status: 'active',
            config: { phoneNumberId: 'waha-phone-id-1' },
          }),
        ]),
      )

      expect(result).toEqual(updatedEndpoint)
    })

    it('updates existing organization_integrations on "connected" instead of inserting duplicate', async () => {
      const updatedEndpoint = {
        endpointId: 'cep-1',
        organizationChannelEndpointId: 'oce-1',
        organizationId: 'org-1',
        number: '+54 9 11 1234-5678',
        provider: 'whatsapp_cloud',
        ownerKind: 'organization',
        status: 'active',
        linkingStatus: 'active',
        connectionStatus: 'connected',
      }

      mockDb.orderBy.mockResolvedValueOnce([
        {
          id: 'cep-1',
          channelId: 'chn_whatsapp',
          number: '+54 9 11 1234-5678',
          ownerOrganizationId: 'org-1',
        },
      ])
      mockDb.limit
        .mockResolvedValueOnce([{ id: 'chn_whatsapp' }])
        .mockResolvedValueOnce([{ id: 'och-1', integrationId: 'int-1' }])
        .mockResolvedValueOnce([
          { id: 'oce-1', status: 'suspended', isPrimary: false, assignedAt: null },
        ])
        .mockResolvedValueOnce([{ id: 'int-1', config: { wabaId: 'waba-1' } }])
        .mockResolvedValueOnce([updatedEndpoint])

      const result = await repository.applyWhatsAppConnectionStatusByPhone({
        phoneNumber: '5491112345678',
        phoneNumberId: 'waha-phone-id-2',
        connectionStatus: 'connected',
      })

      expect(result).toEqual(updatedEndpoint)
      expect(mockDb.insert).not.toHaveBeenCalled()

      const setPayloads = mockDb.set.mock.calls.map(([arg]: [any]) => arg)
      expect(setPayloads).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'active',
            config: expect.objectContaining({ phoneNumberId: 'waha-phone-id-2' }),
          }),
        ]),
      )
    })

    it.each([
      ['waiting_qr', 'disabled'],
      ['disconnected', 'disabled'],
      ['error', 'error'],
    ] as const)(
      'on "%s": deactivates endpoint, suspends link, disables channel, and sets existing integration status to "%s"',
      async (connectionStatus, expectedIntegrationStatus) => {
        const updatedEndpoint = {
          endpointId: 'cep-1',
          organizationChannelEndpointId: 'oce-1',
          organizationId: 'org-1',
          number: '+54 9 11 1234-5678',
          provider: 'whatsapp_cloud',
          ownerKind: 'organization',
          status: 'inactive',
          linkingStatus: 'suspended',
          connectionStatus,
        }

        mockDb.orderBy.mockResolvedValueOnce([
          {
            id: 'cep-1',
            channelId: 'chn_whatsapp',
            number: '+54 9 11 1234-5678',
            ownerOrganizationId: 'org-1',
          },
        ])
        mockDb.returning
          .mockResolvedValueOnce([
            {
              id: 'cep-1',
              number: '+54 9 11 1234-5678',
              status: 'inactive',
              connectionStatus,
              ownerOrganizationId: 'org-1',
            },
          ])
          .mockResolvedValueOnce([{ id: 'oce-1', status: 'suspended', isPrimary: false }])
        mockDb.limit
          .mockResolvedValueOnce([{ id: 'chn_whatsapp' }])
          .mockResolvedValueOnce([{ id: 'och-1', integrationId: 'int-1' }])
          .mockResolvedValueOnce([
            { id: 'oce-1', status: 'active', isPrimary: true, assignedAt: new Date(1000) },
          ])
          .mockResolvedValueOnce([{ id: 'int-1', status: 'active' }])
          .mockResolvedValueOnce([updatedEndpoint])

        const result = await repository.applyWhatsAppConnectionStatusByPhone({
          phoneNumber: '+5491112345678',
          connectionStatus,
        })

        expect(result).toEqual(updatedEndpoint)

        const setPayloads = mockDb.set.mock.calls.map(([arg]: [any]) => arg)
        expect(setPayloads).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ status: 'inactive', connectionStatus }),
            expect.objectContaining({ status: 'suspended', isPrimary: false }),
            expect.objectContaining({ isEnabled: false }),
            expect.objectContaining({ status: expectedIntegrationStatus }),
          ]),
        )
      },
    )

    it('skips integration update on non-connected status when no integration row exists', async () => {
      const updatedEndpoint = {
        endpointId: 'cep-1',
        organizationChannelEndpointId: 'oce-1',
        organizationId: 'org-1',
        number: '+54 9 11 1234-5678',
        provider: 'whatsapp_cloud',
        ownerKind: 'organization',
        status: 'inactive',
        linkingStatus: 'suspended',
        connectionStatus: 'disconnected',
      }

      mockDb.orderBy.mockResolvedValueOnce([
        {
          id: 'cep-1',
          channelId: 'chn_whatsapp',
          number: '+54 9 11 1234-5678',
          ownerOrganizationId: 'org-1',
        },
      ])
      mockDb.limit
        .mockResolvedValueOnce([{ id: 'chn_whatsapp' }])
        .mockResolvedValueOnce([{ id: 'och-1', integrationId: null }])
        .mockResolvedValueOnce([
          { id: 'oce-1', status: 'active', isPrimary: true, assignedAt: new Date(1000) },
        ])
        .mockResolvedValueOnce([]) // no integration row
        .mockResolvedValueOnce([updatedEndpoint])

      const result = await repository.applyWhatsAppConnectionStatusByPhone({
        phoneNumber: '+5491112345678',
        connectionStatus: 'disconnected',
      })

      expect(result).toEqual(updatedEndpoint)
      const setPayloads = mockDb.set.mock.calls.map(([arg]: [any]) => arg)
      expect(setPayloads.some((p: any) => p.status === 'disabled' || p.status === 'error')).toBe(
        false,
      )
    })
  })
})

