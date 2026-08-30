import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { policyCoverages } from '@copas/db';
import type { PolicyCoverage, CreatePolicyCoverageRequest } from '@copas/contracts';

function getClient(db: any, tx?: any) {
  if (tx) {
    return typeof tx.prepare === 'function' ? drizzle(tx) : tx;
  }
  const base = db?.db ?? db;
  return typeof base?.prepare === 'function' ? drizzle(base) : base;
}

export function createPolicyCoveragesRepository(db: D1Database | any, organizationId: string) {
  return {
    findById: async (id: string, tx?: any): Promise<PolicyCoverage | null> => {
      const client = getClient(db, tx);
      const rows = await client
        .select()
        .from(policyCoverages)
        .where(eq(policyCoverages.id, id))
        .limit(1);
      return rows?.[0] ?? null;
    },

    findByPolicyId: async (policyId: string, tx?: any): Promise<PolicyCoverage[]> => {
      const client = getClient(db, tx);
      const rows = await client
        .select()
        .from(policyCoverages)
        .where(eq(policyCoverages.policyId, policyId));
      return rows ?? [];
    },

    create: async (data: CreatePolicyCoverageRequest | any, tx?: any): Promise<PolicyCoverage> => {
      const client = getClient(db, tx);
      const rows = await client
        .insert(policyCoverages)
        .values({
          policyId: data.policyId,
          data: data.data || {},
        })
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    createCoverage: async (policyId: string, data: Record<string, unknown>, tx?: any): Promise<PolicyCoverage> => {
      const client = getClient(db, tx);
      const rows = await client
        .insert(policyCoverages)
        .values({ policyId, data: data || {} })
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    createMany: async (data: (CreatePolicyCoverageRequest | any)[], tx?: any): Promise<PolicyCoverage[]> => {
      if (!data || data.length === 0) return [];
      const client = getClient(db, tx);
      const values = data.map((d) => ({
        policyId: d.policyId,
        data: d.data || {},
      }));
      const rows = await client
        .insert(policyCoverages)
        .values(values)
        .returning();
      return Array.isArray(rows) ? rows : [rows];
    },

    update: async (id: string, data: Partial<CreatePolicyCoverageRequest> | any, tx?: any): Promise<PolicyCoverage> => {
      const client = getClient(db, tx);
      const rows = await client
        .update(policyCoverages)
        .set(data)
        .where(eq(policyCoverages.id, id))
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    delete: async (id: string, tx?: any): Promise<void> => {
      const client = getClient(db, tx);
      await client
        .delete(policyCoverages)
        .where(eq(policyCoverages.id, id));
    },

    deleteByPolicyId: async (policyId: string, tx?: any): Promise<void> => {
      const client = getClient(db, tx);
      await client
        .delete(policyCoverages)
        .where(eq(policyCoverages.policyId, policyId));
    },
  };
}

export type PolicyCoveragesRepository = ReturnType<typeof createPolicyCoveragesRepository>;

