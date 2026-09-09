import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm'
import { messages, messageStatuses } from '@copas/db'
import type { Message, MessageInsert } from '@copas/contracts'

function getClient(db: any, tx?: any) {
  if (tx) {
    if (tx.select) return tx
    return typeof tx.prepare === 'function' ? drizzle(tx) : tx
  }
  const base = db?.db ?? db
  if (base?.select) return base
  return typeof base?.prepare === 'function' ? drizzle(base) : base
}

export function createMessagesRepository(arg1: any, arg2?: string) {
  const database: D1Database = arg1.db || arg1
  const organizationId = arg2 || ''
  
  return {
    findByDeduplicationHash: async (first: any, second?: any, third?: any): Promise<Message | null> => {
      let orgId = organizationId
      let hash = ''
      let tx: any = undefined

      if (typeof first === 'object' && first !== null) {
        hash = first.deduplicationHash || first.hash
        tx = second
      } else if (second !== undefined && typeof second === 'string') {
        orgId = first
        hash = second
        tx = third
      } else {
        hash = first
        tx = second
      }
      const client = getClient(database, tx)
      const query = client.select().from(messages).where(
        orgId
          ? and(eq(messages.organizationId, orgId), eq(messages.deduplicationHash, hash))
          : eq(messages.deduplicationHash, hash)
      )
      const rows = typeof query?.limit === 'function' ? await query.limit(1) : await query
      const res = Array.isArray(rows) ? rows[0] : rows
      if (!res || res === client || res.select) return null
      return res as any
    },

    create: async (data: MessageInsert | any, tx?: any): Promise<Message> => {
      const client = getClient(database, tx)
      const now = new Date().toISOString()
      
      const payload = {
        id: data.id || crypto.randomUUID(),
        organizationId: data.organizationId || organizationId,
        conversationId: data.conversationId,
        direction: data.direction || 'outbound',
        status: data.status || 'sent',
        senderKind: data.senderKind || 'system',
        content: data.content ?? null,
        deduplicationHash: data.deduplicationHash ?? null,
        sentAt: data.sentAt || data.createdAt || now,
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now,
      }
      
      const query = client.insert(messages).values(payload)
      const rows = typeof query.returning === 'function' ? await query.returning() : await query
      const res = Array.isArray(rows) ? rows[0] : rows
      return (res as any) || (payload as any)
    },

    createStatus: async (
      arg1: string | { messageId: string; status: any; reason?: string | null; details?: any; rawPayload?: any },
      arg2?: any,
      arg3?: any,
      arg4?: any
    ): Promise<any> => {
      const isObj = typeof arg1 === 'object' && arg1 !== null
      const messageId = isObj ? arg1.messageId : arg1
      const status = isObj ? arg1.status : arg2
      const details = isObj ? (arg1.details ?? (arg1.reason ? { reason: arg1.reason } : null)) : arg3
      const tx = isObj ? arg2 : arg4

      const client = getClient(database, tx)
      const now = new Date().toISOString()
      
      const payload = {
        id: (isObj && (arg1 as any).id) || crypto.randomUUID(),
        messageId,
        status,
        reason: (isObj && arg1.reason) ?? null,
        rawPayload: (isObj && arg1.rawPayload) ?? null,
        details: details ?? null,
        createdAt: (isObj && (arg1 as any).createdAt) || now,
      }

      const query = client.insert(messageStatuses).values(payload)
      const rows = typeof query.returning === 'function' ? await query.returning() : await query
      const res = Array.isArray(rows) ? rows[0] : rows
      return res || payload
    },
  }
}

export type MessagesRepository = ReturnType<typeof createMessagesRepository>
