import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq, isNull } from 'drizzle-orm'
import { reminderRules } from '@copas/db'
import type {
  ReminderRule,
  ReminderRuleInsert,
  ReminderRuleUpdate,
} from '@copas/contracts'

function getClient(db: any, tx?: any) {
  if (tx) return typeof tx.prepare === 'function' ? drizzle(tx) : tx
  const base = db?.db ?? db
  return typeof base?.prepare === 'function' ? drizzle(base) : base
}

export function createReminderRulesRepository(arg1: any, arg2?: string) {
  const database: D1Database = arg1.db || arg1
  const organizationId = arg2 || ''
  
  return {
    findAll: async (arg1?: string | any, arg2?: any): Promise<ReminderRule[]> => {
      const tx = arg2 || (typeof arg1 === 'object' ? arg1 : undefined)
      const org = typeof arg1 === 'string' ? arg1 : organizationId
      const client = getClient(database, tx)
      return await client.select().from(reminderRules).where(and(eq(reminderRules.organizationId, org), isNull(reminderRules.deletedAt)))
    },

    findActive: async (arg1?: string | any, arg2?: any): Promise<ReminderRule[]> => {
      const tx = arg2 || (typeof arg1 === 'object' ? arg1 : undefined)
      const org = typeof arg1 === 'string' ? arg1 : organizationId
      const client = getClient(database, tx)
      return await client.select().from(reminderRules).where(and(eq(reminderRules.organizationId, org), eq(reminderRules.isEnabled, true), isNull(reminderRules.deletedAt)))
    },

    findById: async (id: string, arg2?: string | any, arg3?: any): Promise<ReminderRule | null> => {
      const tx = arg3 || (typeof arg2 === 'object' ? arg2 : undefined)
      const org = typeof arg2 === 'string' ? arg2 : organizationId
      const client = getClient(database, tx)
      const q = client.select().from(reminderRules).where(and(eq(reminderRules.organizationId, org), eq(reminderRules.id, id), isNull(reminderRules.deletedAt)))
      const rows = await (typeof (q as any).limit === 'function' ? (q as any).limit(1) : q)
      const res = Array.isArray(rows) ? rows[0] : rows
      return (res as any) || null
    },

    create: async (data: ReminderRuleInsert, arg2?: string | any, arg3?: any): Promise<ReminderRule> => {
      const tx = arg3 || (typeof arg2 === 'object' ? arg2 : undefined)
      const org = typeof arg2 === 'string' ? arg2 : organizationId
      const client = getClient(database, tx)
      
      const payload = {
        id: data.id || crypto.randomUUID(),
        organizationId: (data as any).organizationId || org,
        eventSource: data.eventSource,
        offsetDays: data.offsetDays,
        templateId: data.templateId,
        isEnabled: data.isEnabled ?? true,
      }
      
      const rows = await client.insert(reminderRules).values(payload).returning()
      
      const res = Array.isArray(rows) ? rows[0] : rows
      if (!res) throw new Error('Failed to create reminder rule')
      return res as any
    },

    update: async (id: string, data: ReminderRuleUpdate, arg3?: string | any, arg4?: any): Promise<ReminderRule | null> => {
      const tx = arg4 || (typeof arg3 === 'object' ? arg3 : undefined)
      const org = typeof arg3 === 'string' ? arg3 : organizationId
      const client = getClient(database, tx)
      
      const payload: any = {}
      if (data.eventSource !== undefined) payload.eventSource = data.eventSource
      if (data.offsetDays !== undefined) payload.offsetDays = data.offsetDays
      if (data.templateId !== undefined) payload.templateId = data.templateId
      if (data.isEnabled !== undefined) payload.isEnabled = data.isEnabled
      
      if (Object.keys(payload).length === 0) {
        const rows = await client.select().from(reminderRules).where(and(eq(reminderRules.organizationId, org), eq(reminderRules.id, id), isNull(reminderRules.deletedAt)))
        const res = Array.isArray(rows) ? rows[0] : rows
        return (res as any) || null
      }
      
      payload.updatedAt = new Date().toISOString()
      const rows = await client.update(reminderRules).set(payload).where(and(eq(reminderRules.organizationId, org), eq(reminderRules.id, id), isNull(reminderRules.deletedAt))).returning()
      
      const res = Array.isArray(rows) ? rows[0] : rows
      return (res as any) || null
    },

    delete: async (id: string, arg2?: string | any, arg3?: any): Promise<boolean> => {
      const tx = arg3 || (typeof arg2 === 'object' ? arg2 : undefined)
      const org = typeof arg2 === 'string' ? arg2 : organizationId
      const client = getClient(database, tx)
      const rows = await client.update(reminderRules).set({ deletedAt: new Date().toISOString() }).where(and(eq(reminderRules.organizationId, org), eq(reminderRules.id, id), isNull(reminderRules.deletedAt))).returning()
      const res = Array.isArray(rows) ? rows[0] : rows
      return !!res
    },
  }
}

export type ReminderRulesRepository = ReturnType<typeof createReminderRulesRepository>
