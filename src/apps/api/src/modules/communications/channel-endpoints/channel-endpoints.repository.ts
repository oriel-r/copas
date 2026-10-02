import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq, desc, asc } from 'drizzle-orm'
import {
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
  }
}

export type ChannelEndpointsRepository = ReturnType<typeof createChannelEndpointsRepository>

