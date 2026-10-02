import { and, eq, isNull, sql } from 'drizzle-orm'
import { sqliteView } from 'drizzle-orm/sqlite-core'

import { channelEndpoints } from '../contexts/communications/channel-endpoints.schema'
import { organizationChannelEndpoints } from '../contexts/communications/organization-channel-endpoints.schema'
import { organizationChannels } from '../contexts/communications/organization-channels.schema'
import { organizationIntegrations } from '../contexts/communications/organization-integrations.schema'

let capturedQuery: any

const baseView = sqliteView('v_active_whatsapp_endpoints').as((qb) => {
  capturedQuery = qb
    .select({
      organizationChannelEndpointId: organizationChannelEndpoints.id,
      organizationId: organizationChannels.organizationId,
      endpointId: channelEndpoints.id,
      endpointNumber: channelEndpoints.number,
      ownerKind: channelEndpoints.ownerKind,
      isPrimary: organizationChannelEndpoints.isPrimary,
      channelId: organizationChannels.channelId,
      integrationId: organizationIntegrations.id,
      integrationStatus: organizationIntegrations.status,
      encryptedCredentials: organizationIntegrations.credentials,
      integrationConfig: organizationIntegrations.config,
    })
    .from(organizationChannelEndpoints)
    .innerJoin(
      organizationChannels,
      eq(organizationChannelEndpoints.organizationChannelId, organizationChannels.id),
    )
    .innerJoin(
      channelEndpoints,
      eq(organizationChannelEndpoints.endpointId, channelEndpoints.id),
    )
    .leftJoin(
      organizationIntegrations,
      eq(organizationChannels.integrationId, organizationIntegrations.id),
    )
    .where(
      and(
        sql`${organizationChannelEndpoints.status} = 'active'`,
        sql`${organizationChannels.isEnabled} = 1`,
        sql`${channelEndpoints.status} = 'active'`,
        sql`${channelEndpoints.provider} = 'whatsapp_cloud'`,
        isNull(organizationChannelEndpoints.deletedAt),
        isNull(organizationChannels.deletedAt),
        isNull(channelEndpoints.deletedAt),
      ),
    )
  return capturedQuery
})

// TODO: El scheduler usará esta vista para resolver endpoints y credenciales cifradas antes de encolar
export const vActiveWhatsAppEndpoints = new Proxy(baseView, {
  get(target, prop, receiver) {
    if (prop === 'query') return capturedQuery
    if (prop === '_') return { name: 'v_active_whatsapp_endpoints', query: capturedQuery }
    try {
      return Reflect.get(target, prop, receiver)
    } catch (e) {
      return undefined
    }
  }
})
