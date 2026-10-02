import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm'
import { vActiveConsents } from '@copas/db'

function getClient(db: any, tx?: any) {
  if (tx) return typeof tx.prepare === 'function' ? drizzle(tx) : tx
  const base = db?.db ?? db
  return typeof base?.prepare === 'function' ? drizzle(base) : base
}

export function createConsentsRepository(arg1: any, arg2?: string) {
  const database: D1Database = arg1.db || arg1
  const organizationId = arg2 || ''
  
  return {
    isOptedOut: async (insuredId: string, categoryCode: string, tx?: any): Promise<boolean> => {
      const client = getClient(database, tx)
      const rows = await client.select({ isOptedOut: vActiveConsents.isOptedOut })
        .from(vActiveConsents)
        .where(
          and(
            eq(vActiveConsents.organizationId, organizationId),
            eq(vActiveConsents.insuredId, insuredId),
            eq(vActiveConsents.categoryCode, categoryCode)
          )
        )
      
      const res = Array.isArray(rows) ? rows[0] : rows
      return res?.isOptedOut === true || res?.isOptedOut === 1
    },
  }
}

export type ConsentsRepository = ReturnType<typeof createConsentsRepository>
