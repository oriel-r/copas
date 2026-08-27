import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { companies } from '@copas/db';
import type { Company, CreateCompanyRequest } from '@copas/contracts';

function getClient(db: any, tx?: any) {
  if (tx) {
    return typeof tx.prepare === 'function' ? drizzle(tx) : tx;
  }
  const base = db?.db ?? db;
  return typeof base?.prepare === 'function' ? drizzle(base) : base;
}

export function createCompaniesRepository(db: D1Database | any, tenantId: string) {
  return {
    findById: async (id: string, tx?: any): Promise<Company | null> => {
      const client = getClient(db, tx);
      const rows = await client.select().from(companies).where(eq(companies.id, id)).limit(1);
      return rows?.[0] ?? null;
    },

    findByCode: async (code: string, tx?: any): Promise<Company | null> => {
      const client = getClient(db, tx);
      const rows = await client.select().from(companies).where(eq(companies.code, code)).limit(1);
      return rows?.[0] ?? null;
    },

    findByName: async (name: string, tx?: any): Promise<Company | null> => {
      const client = getClient(db, tx);
      const rows = await client.select().from(companies).where(eq(companies.name, name)).limit(1);
      return rows?.[0] ?? null;
    },

    create: async (data: CreateCompanyRequest, tx?: any): Promise<Company> => {
      const client = getClient(db, tx);
      const rows = await client.insert(companies).values(data).returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    list: async (params?: { limit?: number; offset?: number }, tx?: any): Promise<Company[]> => {
      const client = getClient(db, tx);
      const rows = await client.select().from(companies).limit(params?.limit ?? 50).offset(params?.offset ?? 0);
      return rows ?? [];
    },
  };
}

export type CompaniesRepository = ReturnType<typeof createCompaniesRepository>;






