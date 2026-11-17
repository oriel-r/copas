import type { OrganizationWhatsAppEndpoint } from '@copas/contracts'
import type { ChannelEndpointsRepository, ResolvedChannelEndpoint } from './channel-endpoints.repository'

export interface ChannelEndpointsServiceOptions {
  platformWhatsAppAccessToken?: string
  platformWhatsAppPhoneNumberId?: string
  platformWhatsAppWabaId?: string
}

export function createChannelEndpointsService(
  arg1: any,
  arg2?: ChannelEndpointsServiceOptions,
) {
  const deps = typeof arg1 === 'object' && arg1 !== null ? arg1 : {}
  const channelEndpointsRepo: ChannelEndpointsRepository =
    deps.channelEndpointsRepository ??
    deps.channelEndpointsRepo ??
    deps.repository ??
    deps.repo ??
    arg1

  const options: ChannelEndpointsServiceOptions =
    arg2 ??
    deps.options ??
    deps

  return {
    resolveWhatsAppEndpointAndCredentials: async (orgId?: string): Promise<ResolvedChannelEndpoint> => {
      let endpoint = null
      if (typeof (channelEndpointsRepo as any).findPrimaryByOrganization === 'function') {
        endpoint = await (channelEndpointsRepo as any).findPrimaryByOrganization(orgId)
      } else if (typeof channelEndpointsRepo.findPrimaryWhatsAppEndpoint === 'function') {
        endpoint = await channelEndpointsRepo.findPrimaryWhatsAppEndpoint()
      }

      if (!endpoint && typeof (channelEndpointsRepo as any).findPlatformFallback === 'function') {
        endpoint = await (channelEndpointsRepo as any).findPlatformFallback('whatsapp')
      }

      if (endpoint) {
        const accessToken = endpoint.accessToken || endpoint.credentials?.accessToken || options.platformWhatsAppAccessToken
        const wabaId = endpoint.wabaId || endpoint.credentials?.wabaId || options.platformWhatsAppWabaId
        const phoneNumberId = endpoint.phoneNumberId || options.platformWhatsAppPhoneNumberId

        return {
          ...endpoint,
          organizationChannelEndpointId: endpoint.organizationChannelEndpointId ?? null,
          endpointId: endpoint.endpointId || endpoint.id,
          phoneNumberId,
          credentials: {
            accessToken,
            wabaId,
          },
        }
      }

      if (options.platformWhatsAppAccessToken && options.platformWhatsAppPhoneNumberId) {
        let fallbackDbEndpoint = null
        if (typeof (channelEndpointsRepo as any).findPlatformFallback === 'function') {
          try {
            fallbackDbEndpoint = await (channelEndpointsRepo as any).findPlatformFallback('whatsapp')
          } catch {
            fallbackDbEndpoint = null
          }
        }
        return {
          organizationChannelEndpointId: fallbackDbEndpoint?.organizationChannelEndpointId ?? null,
          endpointId: fallbackDbEndpoint?.endpointId || fallbackDbEndpoint?.id,
          phoneNumberId: options.platformWhatsAppPhoneNumberId,
          provider: 'whatsapp',
          ownerKind: 'platform',
          credentials: {
            accessToken: options.platformWhatsAppAccessToken,
            wabaId: options.platformWhatsAppWabaId,
          },
        }
      }

      throw new Error('No WhatsApp channel endpoint available')
    },

    getOrganizationWhatsAppEndpoint: async (
      orgId?: string,
    ): Promise<OrganizationWhatsAppEndpoint | null> => {
      return await channelEndpointsRepo.findOrganizationWhatsAppEndpoint(orgId)
    },

    upsertOrganizationWhatsAppEndpoint: async (
      number: string,
      orgId?: string,
    ): Promise<OrganizationWhatsAppEndpoint> => {
      const cleanNumber = number.trim()
      if (!cleanNumber) {
        throw new Error('Phone number is required')
      }
      return await channelEndpointsRepo.upsertOrganizationWhatsAppEndpoint(cleanNumber, orgId)
    },
  }
}

export type ChannelEndpointsService = ReturnType<typeof createChannelEndpointsService>
