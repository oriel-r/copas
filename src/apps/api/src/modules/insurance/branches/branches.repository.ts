import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { branches } from '@copas/db';
import type { Branch, CreateBranchRequest } from '@copas/contracts';

function getClient(db: any, tx?: any) {
  if (tx) {
    return typeof tx.prepare === 'function' ? drizzle(tx) : tx;
  }
  const base = db?.db ?? db;
  return typeof base?.prepare === 'function' ? drizzle(base) : base;
}

export function createBranchesRepository(db: D1Database | any, organizationId: string) {
  return {
    findById: async (id: string, tx?: any): Promise<Branch | null> => {
      const client = getClient(db, tx);
      const rows = await client.select().from(branches).where(eq(branches.id, id)).limit(1);
      return rows?.[0] ?? null;
    },

    findByCode: async (code: string, tx?: any): Promise<Branch | null> => {
      const client = getClient(db, tx);
      const rows = await client.select().from(branches).where(eq(branches.code, code)).limit(1);
      return rows?.[0] ?? null;
    },

    create: async (data: CreateBranchRequest, tx?: any): Promise<Branch> => {
      const client = getClient(db, tx);
      const rows = await client.insert(branches).values(data).returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    list: async (params?: { limit?: number; offset?: number }, tx?: any): Promise<Branch[]> => {
      const client = getClient(db, tx);
      const rows = await client.select().from(branches).limit(params?.limit ?? 50).offset(params?.offset ?? 0);
      return rows ?? [];
    },
  };
}

export type BranchesRepository = ReturnType<typeof createBranchesRepository>;



