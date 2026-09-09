import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq, desc, asc } from 'drizzle-orm'
import { organizationChannelEndpoints, channelEndpoints } from '@copas/db'

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

      const rows = await client
        .select({
          organizationChannelEndpointId: oce.id,
          endpointId: ce.id,
          phoneNumberId: ce.phoneNumberId,
          number: ce.number,
          provider: ce.provider,
          ownerKind: ce.ownerKind,
          credentials: ce.credentials,
        })
        .from(organizationChannelEndpoints)
        .innerJoin(channelEndpoints, eq(oce.endpointId || oce.channelEndpointId, ce.id))
        .where(
          and(
            eq(oce.organizationId, organizationId),
            eq(ce.provider, 'whatsapp'),
            eq(oce.status, 'active')
          )
        )
        .orderBy(desc(oce.isPrimary), asc(oce.createdAt))

      const res = Array.isArray(rows) ? rows[0] : rows
      if (!res) return null

      return {
        organizationChannelEndpointId: res.organizationChannelEndpointId,
        endpointId: res.endpointId,
        phoneNumberId: res.phoneNumberId ?? undefined,
        number: res.number ?? undefined,
        provider: res.provider,
        ownerKind: res.ownerKind as any,
        credentials: typeof res.credentials === 'string' ? JSON.parse(res.credentials) : (res.credentials as any)
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
