import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq, desc, asc, isNull, ne, or } from 'drizzle-orm'
import {
  buildPhoneDigitCandidates,
  normalizePhoneDigits,
  type OrganizationWhatsAppEndpoint,
  type WhatsAppConnectionStatus,
} from '@copas/contracts'
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

async function ensureOrgWhatsAppChannel(client: any, targetOrgId: string) {
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

  return { channelId, orgChannel }
}

function toOrganizationWhatsAppEndpoint(params: {
  endpoint: any
  link: any
  organizationId: string
  fallbackNumber?: string | null
}): OrganizationWhatsAppEndpoint {
  const { endpoint, link, organizationId, fallbackNumber = null } = params
  return {
    endpointId: endpoint.id ?? endpoint.endpointId,
    organizationChannelEndpointId: link?.id ?? endpoint.organizationChannelEndpointId ?? null,
    organizationId: endpoint.ownerOrganizationId ?? endpoint.organizationId ?? organizationId,
    number: endpoint.number ?? fallbackNumber,
    provider: 'whatsapp_cloud',
    ownerKind: 'organization',
    status: endpoint.status as OrganizationWhatsAppEndpoint['status'],
    linkingStatus: (link?.status ?? endpoint.linkingStatus ?? 'suspended') as OrganizationWhatsAppEndpoint['linkingStatus'],
    connectionStatus: (endpoint.connectionStatus ?? null) as OrganizationWhatsAppEndpoint['connectionStatus'],
  }
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
          connectionStatus: channelEndpoints.connectionStatus,
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

      return toOrganizationWhatsAppEndpoint({
        endpoint: row,
        link: null,
        organizationId: targetOrgId,
      })
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
      const { channelId, orgChannel } = await ensureOrgWhatsAppChannel(client, targetOrgId)

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
        const nextConnectionStatus = hasNumberChanged ? null : existingEndpoint.connectionStatus

        const updatedEndpoints = await client
          .update(channelEndpoints)
          .set({
            number: cleanNumber,
            status: nextStatus,
            connectionStatus: nextConnectionStatus,
            updatedAt: new Date(),
          })
          .where(eq(channelEndpoints.id, existingEndpoint.id))
          .returning()

        const updatedEndpoint = updatedEndpoints[0] ?? {
          ...existingEndpoint,
          number: cleanNumber,
          status: nextStatus,
          connectionStatus: nextConnectionStatus,
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

        return toOrganizationWhatsAppEndpoint({
          endpoint: updatedEndpoint,
          link,
          organizationId: targetOrgId,
          fallbackNumber: cleanNumber,
        })
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
          connectionStatus: null,
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

      return toOrganizationWhatsAppEndpoint({
        endpoint: createdEndpoint,
        link: createdLink,
        organizationId: targetOrgId,
        fallbackNumber: cleanNumber,
      })
    },

    applyWhatsAppConnectionStatusByPhone: async (
      params: {
        phoneNumber: string
        phoneNumberId?: string
        connectionStatus: WhatsAppConnectionStatus
      },
      tx?: any,
    ): Promise<OrganizationWhatsAppEndpoint | null> => {
      const targetCandidates = new Set(buildPhoneDigitCandidates(params.phoneNumber))
      if (targetCandidates.size === 0 && params.phoneNumberId) {
        for (const c of buildPhoneDigitCandidates(params.phoneNumberId)) {
          targetCandidates.add(c)
        }
      }
      if (targetCandidates.size === 0) {
        return null
      }

      const client = getClient(database, tx)
      const orgEndpoints = await client
        .select()
        .from(channelEndpoints)
        .where(
          and(
            eq(channelEndpoints.ownerKind, 'organization'),
            eq(channelEndpoints.provider, 'whatsapp_cloud'),
            isNull(channelEndpoints.deletedAt),
          ),
        )
        .orderBy(desc(channelEndpoints.updatedAt))

      const matchedEndpoint = orgEndpoints.find((ep: any) => {
        if (!ep?.ownerOrganizationId || !ep?.number) return false
        const epCandidates = buildPhoneDigitCandidates(String(ep.number))
        return epCandidates.some((candidate) => targetCandidates.has(candidate))
      })

      if (!matchedEndpoint || !matchedEndpoint.ownerOrganizationId) {
        return null
      }

      const targetOrgId = String(matchedEndpoint.ownerOrganizationId)
      const { orgChannel } = await ensureOrgWhatsAppChannel(client, targetOrgId)
      const now = new Date()

      const existingLinks = await client
        .select()
        .from(organizationChannelEndpoints)
        .where(
          and(
            eq(organizationChannelEndpoints.organizationChannelId, orgChannel.id),
            eq(organizationChannelEndpoints.endpointId, matchedEndpoint.id),
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
            endpointId: matchedEndpoint.id,
            label: 'WhatsApp Agencia',
            isPrimary: false,
            status: 'suspended',
          })
          .returning()
        link = insertedLinks[0]
      }

      const isConnected = params.connectionStatus === 'connected'
      const nextEndpointStatus = isConnected ? 'active' : 'inactive'
      const nextLinkStatus = isConnected ? 'active' : 'suspended'

      if (isConnected) {
        // Deactivate any previous active or primary link on this org channel before activating
        // so partial unique indexes (organization_channel_endpoints_active_uq / _primary_uq) remain valid.
        await client
          .update(organizationChannelEndpoints)
          .set({
            status: 'suspended',
            isPrimary: false,
            updatedAt: now,
          })
          .where(
            and(
              eq(organizationChannelEndpoints.organizationChannelId, orgChannel.id),
              ne(organizationChannelEndpoints.id, link.id),
              or(
                eq(organizationChannelEndpoints.status, 'active'),
                eq(organizationChannelEndpoints.isPrimary, true),
              ),
            ),
          )
      }

      const updatedEndpoints = await client
        .update(channelEndpoints)
        .set({
          status: nextEndpointStatus,
          connectionStatus: params.connectionStatus,
          updatedAt: now,
        })
        .where(eq(channelEndpoints.id, matchedEndpoint.id))
        .returning()

      const updatedEndpoint = updatedEndpoints[0] ?? {
        ...matchedEndpoint,
        status: nextEndpointStatus,
        connectionStatus: params.connectionStatus,
      }

      const updatedLinks = await client
        .update(organizationChannelEndpoints)
        .set({
          status: nextLinkStatus,
          isPrimary: isConnected,
          assignedAt: isConnected ? (link.assignedAt ?? now) : link.assignedAt,
          updatedAt: now,
        })
        .where(eq(organizationChannelEndpoints.id, link.id))
        .returning()

      const updatedLink = updatedLinks[0] ?? {
        ...link,
        status: nextLinkStatus,
        isPrimary: isConnected,
      }

      const effectivePhoneNumberId =
        params.phoneNumberId?.trim() ||
        normalizePhoneDigits(matchedEndpoint.number ?? params.phoneNumber)

      let integrationId = orgChannel.integrationId as string | null
      if (isConnected) {
        if (integrationId) {
          const existingIntegrations = await client
            .select()
            .from(organizationIntegrations)
            .where(eq(organizationIntegrations.id, integrationId))
            .limit(1)
          const existingIntegration = existingIntegrations?.[0]
          const prevConfig =
            existingIntegration?.config && typeof existingIntegration.config === 'object'
              ? existingIntegration.config
              : {}
          await client
            .update(organizationIntegrations)
            .set({
              status: 'active',
              config: {
                ...prevConfig,
                phoneNumberId: effectivePhoneNumberId,
              },
              updatedAt: now,
            })
            .where(eq(organizationIntegrations.id, integrationId))
        } else {
          const insertedIntegrations = await client
            .insert(organizationIntegrations)
            .values({
              organizationId: targetOrgId,
              provider: 'whatsapp_cloud',
              status: 'active',
              credentials: null,
              config: { phoneNumberId: effectivePhoneNumberId },
            })
            .returning()
          integrationId = insertedIntegrations[0]?.id ?? null
        }

        await client
          .update(organizationChannels)
          .set({
            isEnabled: true,
            integrationId,
            updatedAt: now,
          })
          .where(eq(organizationChannels.id, orgChannel.id))
      } else {
        await client
          .update(organizationChannels)
          .set({
            isEnabled: false,
            updatedAt: now,
          })
          .where(eq(organizationChannels.id, orgChannel.id))

        if (integrationId) {
          await client
            .update(organizationIntegrations)
            .set({
              status: params.connectionStatus === 'error' ? 'error' : 'disabled',
              updatedAt: now,
            })
            .where(eq(organizationIntegrations.id, integrationId))
        }
      }

      return toOrganizationWhatsAppEndpoint({
        endpoint: updatedEndpoint,
        link: updatedLink,
        organizationId: targetOrgId,
      })
    },
  }
}

export type ChannelEndpointsRepository = ReturnType<typeof createChannelEndpointsRepository>

