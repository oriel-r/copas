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
})

