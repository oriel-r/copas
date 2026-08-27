import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import { assetTypes } from '@copas/db';
import type { AssetType, CreateAssetTypeRequest } from '@copas/contracts';

function getClient(db: any, tx?: any) {
  if (tx) {
    return typeof tx.prepare === 'function' ? drizzle(tx) : tx;
  }
  const base = db?.db ?? db;
  return typeof base?.prepare === 'function' ? drizzle(base) : base;
}

export function createAssetTypesRepository(db: D1Database | any, tenantId: string) {
  return {
    findById: async (id: string, tx?: any): Promise<AssetType | null> => {
      const client = getClient(db, tx);
      const rows = await client.select().from(assetTypes).where(eq(assetTypes.id, id)).limit(1);
      return rows?.[0] ?? null;
    },

    findByCode: async (code: string, branchId?: string, tx?: any): Promise<AssetType | null> => {
      const client = getClient(db, tx);
      const condition = branchId
        ? and(eq(assetTypes.code, code), eq(assetTypes.branchId, branchId))
        : eq(assetTypes.code, code);
      const rows = await client.select().from(assetTypes).where(condition).limit(1);
      return rows?.[0] ?? null;
    },

    create: async (data: CreateAssetTypeRequest, tx?: any): Promise<AssetType> => {
      const client = getClient(db, tx);
      const rows = await client.insert(assetTypes).values(data).returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    list: async (params?: { limit?: number; offset?: number }, tx?: any): Promise<AssetType[]> => {
      const client = getClient(db, tx);
      const rows = await client.select().from(assetTypes).limit(params?.limit ?? 50).offset(params?.offset ?? 0);
      return rows ?? [];
    },
  };
}

export type AssetTypesRepository = ReturnType<typeof createAssetTypesRepository>;

