import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq, isNull } from 'drizzle-orm'
import { conversations, conversationEntities, conversationParticipants } from '@copas/db'
import type { Conversation, ConversationInsert } from '@copas/contracts'

function getClient(db: any, tx?: any) {
  if (tx) {
    if (tx.select) return tx
    return typeof tx.prepare === 'function' ? drizzle(tx) : tx
  }
  const base = db?.db ?? db
  if (base?.select) return base
  return typeof base?.prepare === 'function' ? drizzle(base) : base
}

export function createConversationsRepository(arg1: any, arg2?: string) {
  const database: D1Database = arg1.db || arg1
  const organizationId = arg2 || ''
  
  return {
    findOpenByInsuredAndEndpoint: async (
      first: string | { insuredId: string; channelEndpointId?: string; organizationChannelEndpointId?: string },
      second?: string | any,
      third?: any
    ): Promise<Conversation | null> => {
      const isObj = typeof first === 'object' && first !== null
      const insuredId = isObj ? first.insuredId : first
      const endpointId = isObj ? (first.channelEndpointId || first.organizationChannelEndpointId) : second
      const tx = isObj ? second : third

      const client = getClient(database, tx)
      const endpointCondition = endpointId
        ? eq(conversations.organizationChannelEndpointId, endpointId)
        : isNull(conversations.organizationChannelEndpointId)

      const query = client.select().from(conversations).where(
        and(
          eq(conversations.organizationId, organizationId),
          eq(conversations.insuredId, insuredId),
          endpointCondition,
          eq(conversations.status, 'open')
        )
      )
      const rows = typeof query?.limit === 'function' ? await query.limit(1) : await query
      const res = Array.isArray(rows) ? rows[0] : rows
      if (!res || res === client || res.select) return null
      return res as any
    },

    create: async (data: ConversationInsert, tx?: any): Promise<Conversation> => {
      const client = getClient(database, tx)
      const rows = await client.insert(conversations).values({
        id: data.id || crypto.randomUUID(),
        organizationId: data.organizationId || organizationId,
        organizationChannelEndpointId: data.organizationChannelEndpointId ?? null,
        insuredId: data.insuredId,
        type: data.type || 'reminder',
        status: data.status || 'open',
        createdAt: data.createdAt ? (typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt) : undefined,
        updatedAt: data.updatedAt ? (typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt) : undefined,
      }).returning()
      
      const res = Array.isArray(rows) ? rows[0] : rows
      if (!res) throw new Error('Failed to create conversation')

      if (data.insuredId && res.id) {
        try {
          await client.insert(conversationParticipants).values({
            id: crypto.randomUUID(),
            conversationId: res.id,
            insuredId: data.insuredId,
            joinedAt: new Date(),
          })
        } catch {
          // Ignore participant insert if already exists
        }
      }

      return res as any
    },

    linkEntity: async (
      conversationId: string,
      entity: { policyId?: string; installmentId?: string; insuredId?: string },
      tx?: any
    ): Promise<void> => {
      const client = getClient(database, tx)
      const now = new Date()

      if (entity.policyId) {
        let hasExisting = false
        if (typeof client?.select === 'function') {
          try {
            const existing = await client
              .select({ id: conversationEntities.id })
              .from(conversationEntities)
              .where(
                and(
                  eq(conversationEntities.conversationId, conversationId),
                  eq(conversationEntities.policyId, entity.policyId),
                ),
              )
            hasExisting = Array.isArray(existing) && existing.length > 0
          } catch {
            hasExisting = false
          }
        }
        if (!hasExisting) {
          await client.insert(conversationEntities).values({
            id: crypto.randomUUID(),
            conversationId,
            policyId: entity.policyId,
            linkedAt: now,
          })
        }
      }

      if (entity.installmentId) {
        let hasExisting = false
        if (typeof client?.select === 'function') {
          try {
            const existing = await client
              .select({ id: conversationEntities.id })
              .from(conversationEntities)
              .where(
                and(
                  eq(conversationEntities.conversationId, conversationId),
                  eq(conversationEntities.installmentId, entity.installmentId),
                ),
              )
            hasExisting = Array.isArray(existing) && existing.length > 0
          } catch {
            hasExisting = false
          }
        }
        if (!hasExisting) {
          await client.insert(conversationEntities).values({
            id: crypto.randomUUID(),
            conversationId,
            installmentId: entity.installmentId,
            linkedAt: now,
          })
        }
      }

      if (entity.insuredId) {
        let hasExisting = false
        if (typeof client?.select === 'function') {
          try {
            const existing = await client
              .select({ id: conversationEntities.id })
              .from(conversationEntities)
              .where(
                and(
                  eq(conversationEntities.conversationId, conversationId),
                  eq(conversationEntities.insuredId, entity.insuredId),
                ),
              )
            hasExisting = Array.isArray(existing) && existing.length > 0
          } catch {
            hasExisting = false
          }
        }
        if (!hasExisting) {
          await client.insert(conversationEntities).values({
            id: crypto.randomUUID(),
            conversationId,
            insuredId: entity.insuredId,
            linkedAt: now,
          })
        }
      }
    },
  }
}

export type ConversationsRepository = ReturnType<typeof createConversationsRepository>
