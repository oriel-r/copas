import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import { insureds } from '@copas/db';
import type { Insured, CreateInsuredRequest } from '@copas/contracts';

function getClient(db: any, tx?: any) {
  if (tx) {
    return typeof tx.prepare === 'function' ? drizzle(tx) : tx;
  }
  const base = db?.db ?? db;
  return typeof base?.prepare === 'function' ? drizzle(base) : base;
}

export function createInsuredsRepository(db: D1Database | any, tenantId: string) {
  return {
    findById: async (id: string, tx?: any): Promise<Insured | null> => {
      const client = getClient(db, tx);
      const rows = await client
        .select()
        .from(insureds)
        .where(and(eq(insureds.organizationId, tenantId), eq(insureds.id, id)))
        .limit(1);
      return rows?.[0] ?? null;
    },

    findByCuit: async (orgIdOrCuit: string, cuitOrTx?: string | any, tx?: any): Promise<Insured | null> => {
      let orgId = tenantId;
      let cuit = orgIdOrCuit;
      let actualTx = cuitOrTx;
      if (typeof cuitOrTx === 'string') {
        orgId = orgIdOrCuit;
        cuit = cuitOrTx;
        actualTx = tx;
      }
      const client = getClient(db, actualTx);
      const rows = await client
        .select()
        .from(insureds)
        .where(and(eq(insureds.organizationId, orgId), eq(insureds.cuit, cuit)))
        .limit(1);
      return rows?.[0] ?? null;
    },

    create: async (data: CreateInsuredRequest | any, tx?: any): Promise<Insured> => {
      const client = getClient(db, tx);
      const rows = await client
        .insert(insureds)
        .values({
          organizationId: data.organizationId || tenantId,
          uploadedBy: data.uploadedBy || 'system',
          cuit: data.cuit || '',
          fullName: data.fullName || data.full_name || '',
          phone: data.phone || null,
          email: data.email || null,
          birthDate: data.birthDate || data.birth_date || null,
        })
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    update: async (id: string, data: Partial<CreateInsuredRequest> | any, tx?: any): Promise<Insured> => {
      const client = getClient(db, tx);
      const rows = await client
        .update(insureds)
        .set(data)
        .where(and(eq(insureds.organizationId, tenantId), eq(insureds.id, id)))
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    list: async (params?: { limit?: number; offset?: number }, tx?: any): Promise<Insured[]> => {
      const client = getClient(db, tx);
      const rows = await client
        .select()
        .from(insureds)
        .where(eq(insureds.organizationId, tenantId))
        .limit(params?.limit ?? 50)
        .offset(params?.offset ?? 0);
      return rows ?? [];
    },
  };
}

export type InsuredsRepository = ReturnType<typeof createInsuredsRepository>;


