import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq, desc, asc, isNull } from 'drizzle-orm'
import type { OrganizationWhatsAppEndpoint } from '@copas/contracts'
import {
  channels,
  organizationChannelEndpoints,
  channelEndpoints,
  organizationChannels,
  organizationIntegrations,
} from '@copas/db'

export interface ResolvedChannelEndpoint {
  organizationChannelEndpointId: string
  endpointId: string
  phoneNumberId?: string
  number?: string
  provider: string
  ownerKind: 'platform' | 'organization'
  credentials: {
    accessToken: string
    wabaId?: string
  }
}

function getClient(db: any, tx?: any) {
  if (tx) return typeof tx.prepare === 'function' ? drizzle(tx) : tx
  const base = db?.db ?? db
  return typeof base?.prepare === 'function' ? drizzle(base) : base
}

export function createChannelEndpointsRepository(arg1: any, arg2?: string) {
  const database: D1Database = arg1.db || arg1
  const organizationId = arg2 || ''
  
  return {
    findPrimaryWhatsAppEndpoint: async (tx?: any): Promise<ResolvedChannelEndpoint | null> => {
      const client = getClient(database, tx)
      const ce = channelEndpoints as any
      const oce = organizationChannelEndpoints as any
      const oc = organizationChannels as any
      const oi = organizationIntegrations as any

      try {
        let query = client
          .select({
            organizationChannelEndpointId: oce.id,
            endpointId: ce.id,
            phoneNumberId: oi?.config ?? ce.phoneNumberId ?? ce.number,
            number: ce.number,
            provider: ce.provider,
            ownerKind: ce.ownerKind,
            credentials: oi?.credentials ?? ce.credentials,
          })
          .from(organizationChannelEndpoints)

        if (typeof query.leftJoin === 'function') {
          query = query
            .innerJoin(organizationChannels, eq(oce.organizationChannelId, oc.id))
            .innerJoin(channelEndpoints, eq(oce.endpointId || oce.channelEndpointId, ce.id))
            .leftJoin(organizationIntegrations, eq(oc.integrationId, oi.id))
            .where(
              and(
                eq(oc.organizationId, organizationId),
                eq(oce.status, 'active'),
                eq(ce.status, 'active')
              )
            )
        } else {
          query = query
            .innerJoin(channelEndpoints, eq(oce.endpointId || oce.channelEndpointId, ce.id))
            .where(
              and(
                eq(oce.organizationId, organizationId),
                eq(oce.status, 'active')
              )
            )
        }

        const rows = await query.orderBy(desc(oce.isPrimary), asc(oce.createdAt))

        const res = Array.isArray(rows) ? rows[0] : rows
        if (!res || res === client || res?.select) return null

        let creds = res.credentials
        if (typeof creds === 'string') {
          try { creds = JSON.parse(creds) } catch { creds = {} }
        }

        let phoneNumberId: string | undefined = undefined
        if (typeof res.phoneNumberId === 'string') {
          if (res.phoneNumberId.startsWith('{')) {
            try {
              const parsed = JSON.parse(res.phoneNumberId)
              phoneNumberId = parsed.phoneNumberId
            } catch {
              phoneNumberId = undefined
            }
          } else {
            phoneNumberId = res.phoneNumberId
          }
        } else if (typeof res.phoneNumberId === 'object' && res.phoneNumberId !== null) {
          phoneNumberId = res.phoneNumberId.phoneNumberId
        }

        return {
          organizationChannelEndpointId: res.organizationChannelEndpointId,
          endpointId: res.endpointId,
          phoneNumberId,
          number: res.number ?? undefined,
          provider: res.provider,
          ownerKind: res.ownerKind as any,
          credentials: (creds as any) || { accessToken: '' }
        }
      } catch {
        // Fallback for raw D1 or alternative queries
        if (typeof (database as any)?.prepare === 'function' && organizationId) {
          const res: any = await (database as any)
            .prepare(
              `SELECT
                 oce.id AS organizationChannelEndpointId,
                 ce.id AS endpointId,
                 ce.number,
                 ce.provider,
                 ce.ownerKind,
                 oi.credentials,
                 oi.config
               FROM organization_channel_endpoints oce
               INNER JOIN organization_channels oc ON oce.organizationChannelId = oc.id
               INNER JOIN channel_endpoints ce ON oce.endpointId = ce.id
               LEFT JOIN organization_integrations oi ON oc.integrationId = oi.id
               WHERE oc.organizationId = ?
                 AND oce.status = 'active'
                 AND ce.status = 'active'
                 AND oce.deleted_at IS NULL
                 AND oc.deleted_at IS NULL
                 AND ce.deleted_at IS NULL
               ORDER BY oce.isPrimary DESC, oce.created_at ASC
               LIMIT 1`
            )
            .bind(organizationId)
            .first()

          if (!res) return null

          let creds = res.credentials
          if (typeof creds === 'string') {
            try { creds = JSON.parse(creds) } catch { creds = {} }
          }
          let cfg = res.config
          if (typeof cfg === 'string') {
            try { cfg = JSON.parse(cfg) } catch { cfg = {} }
          }

          return {
            organizationChannelEndpointId: res.organizationChannelEndpointId,
            endpointId: res.endpointId,
            phoneNumberId: (typeof cfg === 'object' && cfg?.phoneNumberId) ? cfg.phoneNumberId : undefined,
            number: res.number ?? undefined,
            provider: res.provider,
            ownerKind: res.ownerKind as any,
            credentials: (creds as any) || { accessToken: '' },
          }
        }
        return null
      }
    },

    findPrimaryByOrganization: async (orgId?: string, tx?: any): Promise<ResolvedChannelEndpoint | null> => {
      const repo = createChannelEndpointsRepository(database, orgId || organizationId)
      return repo.findPrimaryWhatsAppEndpoint(tx)
    },

    findPlatformFallback: async (_channel?: string, tx?: any): Promise<ResolvedChannelEndpoint | null> => {
      const repo = createChannelEndpointsRepository(database, '')
      return repo.findPrimaryWhatsAppEndpoint(tx)
    },

    findOrganizationWhatsAppEndpoint: async (
      orgId?: string,
      tx?: any,
    ): Promise<OrganizationWhatsAppEndpoint | null> => {
      const targetOrgId = orgId || organizationId
      if (!targetOrgId) return null

      const client = getClient(database, tx)
      const rows = await client
        .select({
          endpointId: channelEndpoints.id,
          organizationChannelEndpointId: organizationChannelEndpoints.id,
          organizationId: channelEndpoints.ownerOrganizationId,
          number: channelEndpoints.number,
          provider: channelEndpoints.provider,
          ownerKind: channelEndpoints.ownerKind,
          status: channelEndpoints.status,
          linkingStatus: organizationChannelEndpoints.status,
        })
        .from(channelEndpoints)
        .leftJoin(
          organizationChannelEndpoints,
          and(
            eq(organizationChannelEndpoints.endpointId, channelEndpoints.id),
            isNull(organizationChannelEndpoints.deletedAt),
          ),
        )
        .where(
          and(
            eq(channelEndpoints.ownerKind, 'organization'),
            eq(channelEndpoints.ownerOrganizationId, targetOrgId),
            eq(channelEndpoints.provider, 'whatsapp_cloud'),
            isNull(channelEndpoints.deletedAt),
          ),
        )
        .orderBy(desc(channelEndpoints.updatedAt))
        .limit(1)

      const row = Array.isArray(rows) ? rows[0] : rows
      if (!row) return null

      return {
        endpointId: row.endpointId,
        organizationChannelEndpointId: row.organizationChannelEndpointId ?? null,
        organizationId: row.organizationId ?? targetOrgId,
        number: row.number ?? null,
        provider: 'whatsapp_cloud',
        ownerKind: 'organization',
        status: row.status as OrganizationWhatsAppEndpoint['status'],
        linkingStatus: (row.linkingStatus ?? 'suspended') as OrganizationWhatsAppEndpoint['linkingStatus'],
      }
    },

    upsertOrganizationWhatsAppEndpoint: async (
      number: string,
      orgId?: string,
      tx?: any,
    ): Promise<OrganizationWhatsAppEndpoint> => {
      const targetOrgId = orgId || organizationId
      if (!targetOrgId) {
        throw new Error('Organization required')
      }

      const cleanNumber = number.trim()
      const client = getClient(database, tx)

      const existingChannels = await client
        .select({ id: channels.id })
        .from(channels)
        .where(and(eq(channels.code, 'whatsapp'), isNull(channels.deletedAt)))
        .limit(1)

      let channelId = existingChannels?.[0]?.id as string | undefined
      if (!channelId) {
        await client
          .insert(channels)
          .values({
            id: 'chn_whatsapp',
            code: 'whatsapp',
            name: 'WhatsApp',
            description: 'Canal oficial de WhatsApp Cloud API',
            isSystem: true,
          })
          .onConflictDoNothing()
        channelId = 'chn_whatsapp'
      }

      const existingOrgChannels = await client
        .select()
        .from(organizationChannels)
        .where(
          and(
            eq(organizationChannels.organizationId, targetOrgId),
            eq(organizationChannels.channelId, channelId),
            isNull(organizationChannels.deletedAt),
          ),
        )
        .limit(1)

      let orgChannel = existingOrgChannels?.[0]
      if (!orgChannel) {
        const insertedOrgChannels = await client
          .insert(organizationChannels)
          .values({
            organizationId: targetOrgId,
            channelId,
            isEnabled: false,
            config: null,
          })
          .returning()
        orgChannel = insertedOrgChannels[0]
      }

      const existingEndpoints = await client
        .select()
        .from(channelEndpoints)
        .where(
          and(
            eq(channelEndpoints.ownerKind, 'organization'),
            eq(channelEndpoints.ownerOrganizationId, targetOrgId),
            eq(channelEndpoints.provider, 'whatsapp_cloud'),
            isNull(channelEndpoints.deletedAt),
          ),
        )
        .orderBy(desc(channelEndpoints.updatedAt))
        .limit(1)

      const existingEndpoint = existingEndpoints?.[0]

      if (existingEndpoint) {
        const hasNumberChanged = (existingEndpoint.number ?? '').trim() !== cleanNumber
        const nextStatus = hasNumberChanged ? 'inactive' : existingEndpoint.status

        const updatedEndpoints = await client
          .update(channelEndpoints)
          .set({
            number: cleanNumber,
            status: nextStatus,
            updatedAt: new Date(),
          })
          .where(eq(channelEndpoints.id, existingEndpoint.id))
          .returning()

        const updatedEndpoint = updatedEndpoints[0] ?? {
          ...existingEndpoint,
          number: cleanNumber,
          status: nextStatus,
        }

        const existingLinks = await client
          .select()
          .from(organizationChannelEndpoints)
          .where(
            and(
              eq(organizationChannelEndpoints.organizationChannelId, orgChannel.id),
              eq(organizationChannelEndpoints.endpointId, existingEndpoint.id),
              isNull(organizationChannelEndpoints.deletedAt),
            ),
          )
          .limit(1)

        let link = existingLinks?.[0]
        if (!link) {
          const insertedLinks = await client
            .insert(organizationChannelEndpoints)
            .values({
              organizationChannelId: orgChannel.id,
              endpointId: existingEndpoint.id,
              label: 'WhatsApp Agencia',
              isPrimary: false,
              status: 'suspended',
            })
            .returning()
          link = insertedLinks[0]
        } else if (hasNumberChanged && link.status === 'active') {
          const updatedLinks = await client
            .update(organizationChannelEndpoints)
            .set({
              status: 'suspended',
              isPrimary: false,
              updatedAt: new Date(),
            })
            .where(eq(organizationChannelEndpoints.id, link.id))
            .returning()
          link = updatedLinks[0] ?? { ...link, status: 'suspended', isPrimary: false }
        }

        return {
          endpointId: updatedEndpoint.id,
          organizationChannelEndpointId: link?.id ?? null,
          organizationId: targetOrgId,
          number: updatedEndpoint.number ?? cleanNumber,
          provider: 'whatsapp_cloud',
          ownerKind: 'organization',
          status: updatedEndpoint.status as OrganizationWhatsAppEndpoint['status'],
          linkingStatus: (link?.status ?? 'suspended') as OrganizationWhatsAppEndpoint['linkingStatus'],
        }
      }

      const insertedEndpoints = await client
        .insert(channelEndpoints)
        .values({
          channelId,
          number: cleanNumber,
          provider: 'whatsapp_cloud',
          ownerKind: 'organization',
          ownerOrganizationId: targetOrgId,
          status: 'inactive',
        })
        .returning()

      const createdEndpoint = insertedEndpoints[0]

      const insertedLinks = await client
        .insert(organizationChannelEndpoints)
        .values({
          organizationChannelId: orgChannel.id,
          endpointId: createdEndpoint.id,
          label: 'WhatsApp Agencia',
          isPrimary: false,
          status: 'suspended',
        })
        .returning()

      const createdLink = insertedLinks[0]

      return {
        endpointId: createdEndpoint.id,
        organizationChannelEndpointId: createdLink?.id ?? null,
        organizationId: targetOrgId,
        number: createdEndpoint.number ?? cleanNumber,
        provider: 'whatsapp_cloud',
        ownerKind: 'organization',
        status: createdEndpoint.status as OrganizationWhatsAppEndpoint['status'],
        linkingStatus: (createdLink?.status ?? 'suspended') as OrganizationWhatsAppEndpoint['linkingStatus'],
      }
    },
  }
}

export type ChannelEndpointsRepository = ReturnType<typeof createChannelEndpointsRepository>

