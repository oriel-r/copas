import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm'
import { conversations, conversationEntities } from '@copas/db'
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
      const query = client.select().from(conversations).where(
        and(
          eq(conversations.organizationId, organizationId),
          eq(conversations.insuredId, insuredId),
          eq(conversations.organizationChannelEndpointId, endpointId),
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
        organizationChannelEndpointId: data.organizationChannelEndpointId,
        insuredId: data.insuredId,
        type: data.type || 'reminder',
        status: data.status || 'open',
        createdAt: data.createdAt ? (typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt) : undefined,
        updatedAt: data.updatedAt ? (typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt) : undefined,
      }).returning()
      
      const res = Array.isArray(rows) ? rows[0] : rows
      if (!res) throw new Error('Failed to create conversation')
      return res as any
    },

    linkEntity: async (
      conversationId: string,
      entity: { policyId?: string; installmentId?: string; insuredId?: string },
      tx?: any
    ): Promise<void> => {
      const client = getClient(database, tx)
      const rowsToInsert: any[] = []
      if (entity.policyId) {
        rowsToInsert.push({
          id: crypto.randomUUID(),
          conversationId,
          policyId: entity.policyId,
        })
      }
      if (entity.installmentId) {
        rowsToInsert.push({
          id: crypto.randomUUID(),
          conversationId,
          installmentId: entity.installmentId,
        })
      }
      if (entity.insuredId) {
        rowsToInsert.push({
          id: crypto.randomUUID(),
          conversationId,
          insuredId: entity.insuredId,
        })
      }

      for (const row of rowsToInsert) {
        await client.insert(conversationEntities).values(row)
      }
    },
  }
}

export type ConversationsRepository = ReturnType<typeof createConversationsRepository>
