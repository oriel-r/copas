import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChannelEndpointsService } from './channel-endpoints.service'

describe('channel-endpoints.service', () => {
  let mockRepo: any
  let service: ReturnType<typeof createChannelEndpointsService>

  beforeEach(() => {
    mockRepo = {
      findPrimaryByOrganization: vi.fn(),
      findPlatformFallback: vi.fn(),
      findById: vi.fn(),
    }
    service = createChannelEndpointsService({ channelEndpointsRepository: mockRepo } as any)
  })

  describe('constructor and dependency injection', () => {
    it('should initialize with object argument', () => {
      const s = createChannelEndpointsService({ channelEndpointsRepository: mockRepo } as any)
      expect(s).toBeDefined()
      expect(typeof s.resolveWhatsAppEndpointAndCredentials).toBe('function')
    })

    it('should initialize with positional argument', () => {
      const s = createChannelEndpointsService(mockRepo as any)
      expect(s).toBeDefined()
      expect(typeof s.resolveWhatsAppEndpointAndCredentials).toBe('function')
    })
  })

  describe('resolveWhatsAppEndpointAndCredentials', () => {
    it('should resolve primary endpoint and credentials when organization has dedicated WhatsApp endpoint', async () => {
      const dedicatedEndpoint = {
        id: 'cep-dedicated-1',
        endpointId: 'cep-dedicated-1',
        organizationId: 'org-1',
        channel: 'whatsapp',
        phoneNumberId: 'phone-id-dedicated',
        wabaId: 'waba-id-dedicated',
        accessToken: 'EAAB_dedicated_token',
        isPrimary: true,
        status: 'active',
      }
      mockRepo.findPrimaryByOrganization.mockResolvedValueOnce(dedicatedEndpoint)

      const result = await service.resolveWhatsAppEndpointAndCredentials('org-1')
      expect(result).toBeDefined()
      expect(result.phoneNumberId).toBe('phone-id-dedicated')
      expect(result.credentials.accessToken).toBe('EAAB_dedicated_token')
      expect(result.endpointId).toBe('cep-dedicated-1')
      expect(mockRepo.findPrimaryByOrganization).toHaveBeenCalledWith('org-1')
      expect(mockRepo.findPlatformFallback).not.toHaveBeenCalled()
    })

    it('should resolve credentials from credentials object when accessToken is not on root', async () => {
      const dedicatedEndpoint = {
        id: 'cep-obj-1',
        endpointId: 'cep-obj-1',
        organizationId: 'org-1',
        channel: 'whatsapp',
        phoneNumberId: 'phone-obj',
        wabaId: 'waba-obj',
        credentials: { accessToken: 'EAAB_obj_token', wabaId: 'waba-obj' },
        isPrimary: true,
        status: 'active',
      }
      mockRepo.findPrimaryByOrganization.mockResolvedValueOnce(dedicatedEndpoint)

      const result = await service.resolveWhatsAppEndpointAndCredentials('org-1')
      expect(result).toBeDefined()
      expect(result.phoneNumberId).toBe('phone-obj')
      expect(result.credentials.accessToken).toBe('EAAB_obj_token')
      expect(result.credentials.wabaId).toBe('waba-obj')
    })

    it('should fallback to platform pool credentials when organization has no dedicated WhatsApp endpoint', async () => {
      const platformEndpoint = {
        id: 'cep-platform-pool',
        endpointId: 'cep-platform-pool',
        organizationId: null,
        channel: 'whatsapp',
        phoneNumberId: 'phone-id-platform-pool',
        wabaId: 'waba-id-platform',
        accessToken: 'EAAB_platform_token',
        isPlatformPool: true,
        status: 'active',
      }
      mockRepo.findPrimaryByOrganization.mockResolvedValueOnce(null)
      mockRepo.findPlatformFallback.mockResolvedValueOnce(platformEndpoint)

      const result = await service.resolveWhatsAppEndpointAndCredentials('org-2')
      expect(result).toBeDefined()
      expect(result.phoneNumberId).toBe('phone-id-platform-pool')
      expect(result.credentials.accessToken).toBe('EAAB_platform_token')
      expect(mockRepo.findPrimaryByOrganization).toHaveBeenCalledWith('org-2')
      expect(mockRepo.findPlatformFallback).toHaveBeenCalledWith('whatsapp')
    })

    it('should fallback when dedicated endpoint has inactive status or is null', async () => {
      const platformEndpoint = {
        id: 'cep-platform-2',
        endpointId: 'cep-platform-2',
        phoneNumberId: 'phone-plat-2',
        wabaId: 'waba-plat-2',
        accessToken: 'EAAB_plat_2',
        isPlatformPool: true,
      }
      mockRepo.findPrimaryByOrganization.mockResolvedValueOnce(null)
      mockRepo.findPlatformFallback.mockResolvedValueOnce(platformEndpoint)

      const result = await service.resolveWhatsAppEndpointAndCredentials('org-inactive')
      expect(result.phoneNumberId).toBe('phone-plat-2')
      expect(result.credentials.accessToken).toBe('EAAB_plat_2')
    })

    it('should throw exact error message when neither dedicated nor platform fallback endpoints are available', async () => {
      mockRepo.findPrimaryByOrganization.mockResolvedValueOnce(null)
      mockRepo.findPlatformFallback.mockResolvedValueOnce(null)

      await expect(service.resolveWhatsAppEndpointAndCredentials('org-unconfigured')).rejects.toThrow(
        'No WhatsApp channel endpoint available',
      )
    })
  })

  describe('getOrganizationWhatsAppEndpoint', () => {
    it('delegates to repository.findOrganizationWhatsAppEndpoint and returns null when none exists', async () => {
      mockRepo.findOrganizationWhatsAppEndpoint = vi.fn().mockResolvedValueOnce(null)

      const result = await service.getOrganizationWhatsAppEndpoint('org-1')

      expect(result).toBeNull()
      expect(mockRepo.findOrganizationWhatsAppEndpoint).toHaveBeenCalledWith('org-1')
    })

    it('delegates to repository.findOrganizationWhatsAppEndpoint and returns the endpoint', async () => {
      const endpoint = {
        endpointId: 'cep-1',
        organizationChannelEndpointId: 'oce-1',
        organizationId: 'org-1',
        number: '+54 9 11 1234-5678',
        provider: 'whatsapp_cloud' as const,
        ownerKind: 'organization' as const,
        status: 'inactive' as const,
        linkingStatus: 'suspended' as const,
      }
      mockRepo.findOrganizationWhatsAppEndpoint = vi.fn().mockResolvedValueOnce(endpoint)

      const result = await service.getOrganizationWhatsAppEndpoint('org-1')

      expect(result).toEqual(endpoint)
      expect(mockRepo.findOrganizationWhatsAppEndpoint).toHaveBeenCalledWith('org-1')
    })
  })

  describe('upsertOrganizationWhatsAppEndpoint', () => {
    it.each([
      ['empty string', ''],
      ['whitespace only', '   '],
    ])('throws "Phone number is required" on %s without calling repository', async (_label, blank) => {
      mockRepo.upsertOrganizationWhatsAppEndpoint = vi.fn()

      await expect(service.upsertOrganizationWhatsAppEndpoint(blank, 'org-1')).rejects.toThrow(
        'Phone number is required',
      )

      expect(mockRepo.upsertOrganizationWhatsAppEndpoint).not.toHaveBeenCalled()
    })

    it('trims phone number and delegates to repository.upsertOrganizationWhatsAppEndpoint', async () => {
      const saved = {
        endpointId: 'cep-1',
        organizationChannelEndpointId: 'oce-1',
        organizationId: 'org-1',
        number: '+54 9 11 1234-5678',
        provider: 'whatsapp_cloud' as const,
        ownerKind: 'organization' as const,
        status: 'inactive' as const,
        linkingStatus: 'suspended' as const,
      }
      mockRepo.upsertOrganizationWhatsAppEndpoint = vi.fn().mockResolvedValueOnce(saved)

      const result = await service.upsertOrganizationWhatsAppEndpoint('  +54 9 11 1234-5678  ', 'org-1')

      expect(result).toEqual(saved)
      expect(mockRepo.upsertOrganizationWhatsAppEndpoint).toHaveBeenCalledWith(
        '+54 9 11 1234-5678',
        'org-1',
      )
    })
  })
})
