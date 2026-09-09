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
          organizationChannelEndpointId: endpoint.organizationChannelEndpointId || endpoint.id,
          endpointId: endpoint.endpointId || endpoint.id,
          phoneNumberId,
          credentials: {
            accessToken,
            wabaId,
          },
        }
      }

      if (options.platformWhatsAppAccessToken && options.platformWhatsAppPhoneNumberId) {
        return {
          organizationChannelEndpointId: 'platform',
          endpointId: 'platform',
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
  }
}

export type ChannelEndpointsService = ReturnType<typeof createChannelEndpointsService>
