import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import { assets } from '@copas/db';
import type { Asset, CreateAssetRequest } from '@copas/contracts';

function getClient(db: any, tx?: any) {
  if (tx) {
    return typeof tx.prepare === 'function' ? drizzle(tx) : tx;
  }
  const base = db?.db ?? db;
  return typeof base?.prepare === 'function' ? drizzle(base) : base;
}

export function createAssetsRepository(db: D1Database | any, organizationId: string) {
  return {
    findById: async (id: string, tx?: any): Promise<Asset | null> => {
      const client = getClient(db, tx);
      const rows = await client
        .select()
        .from(assets)
        .where(eq(assets.id, id))
        .limit(1);
      return rows?.[0] ?? null;
    },

    findByInsuredId: async (insuredId: string, tx?: any): Promise<Asset[]> => {
      const client = getClient(db, tx);
      const rows = await client
        .select()
        .from(assets)
        .where(eq(assets.insuredId, insuredId));
      return rows ?? [];
    },

    findByInsuredAndType: async (insuredId: string, assetTypeId: string, tx?: any): Promise<Asset | null> => {
      const client = getClient(db, tx);
      const rows = await client
        .select()
        .from(assets)
        .where(and(eq(assets.insuredId, insuredId), eq(assets.assetTypeId, assetTypeId)))
        .limit(1);
      return rows?.[0] ?? null;
    },

    create: async (data: CreateAssetRequest | any, tx?: any): Promise<Asset> => {
      const client = getClient(db, tx);
      const rows = await client
        .insert(assets)
        .values({
          insuredId: data.insuredId,
          assetTypeId: data.assetTypeId,
          uploadedBy: data.uploadedBy || 'system',
          properties: data.properties || {},
        })
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    update: async (id: string, data: Partial<CreateAssetRequest> | any, tx?: any): Promise<Asset> => {
      const client = getClient(db, tx);
      const rows = await client
        .update(assets)
        .set(data)
        .where(eq(assets.id, id))
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    delete: async (id: string, tx?: any): Promise<void> => {
      const client = getClient(db, tx);
      await client.delete(assets).where(eq(assets.id, id));
    },

    list: async (params?: { insuredId?: string; assetTypeId?: string; limit?: number; offset?: number }, tx?: any): Promise<Asset[]> => {
      const client = getClient(db, tx);
      let q = client.select().from(assets);
      if (params?.insuredId && params?.assetTypeId) {
        q = q.where(and(eq(assets.insuredId, params.insuredId), eq(assets.assetTypeId, params.assetTypeId)));
      } else if (params?.insuredId) {
        q = q.where(eq(assets.insuredId, params.insuredId));
      } else if (params?.assetTypeId) {
        q = q.where(eq(assets.assetTypeId, params.assetTypeId));
      }
      const rows = await q.limit(params?.limit ?? 50).offset(params?.offset ?? 0);
      return rows ?? [];
    },
  };
}

export type AssetsRepository = ReturnType<typeof createAssetsRepository>;

