import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import { policyAssets } from '@copas/db';
import type { PolicyAsset, CreatePolicyAssetRequest } from '@copas/contracts';

function getClient(db: any, tx?: any) {
  if (tx) {
    return typeof tx.prepare === 'function' ? drizzle(tx) : tx;
  }
  const base = db?.db ?? db;
  return typeof base?.prepare === 'function' ? drizzle(base) : base;
}

export function createPolicyAssetsRepository(db: D1Database | any, organizationId: string) {
  return {
    create: async (data: CreatePolicyAssetRequest | { policyId: string; assetId: string }, tx?: any): Promise<PolicyAsset> => {
      const client = getClient(db, tx);
      const rows = await client
        .insert(policyAssets)
        .values({
          policyId: data.policyId,
          assetId: data.assetId,
        })
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    linkAsset: async (policyId: string, assetId: string, tx?: any): Promise<PolicyAsset> => {
      const client = getClient(db, tx);
      const rows = await client
        .insert(policyAssets)
        .values({ policyId, assetId })
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    findByPolicyId: async (policyId: string, tx?: any): Promise<PolicyAsset[]> => {
      const client = getClient(db, tx);
      const rows = await client
        .select()
        .from(policyAssets)
        .where(eq(policyAssets.policyId, policyId));
      return rows ?? [];
    },

    findByAssetId: async (assetId: string, tx?: any): Promise<PolicyAsset[]> => {
      const client = getClient(db, tx);
      const rows = await client
        .select()
        .from(policyAssets)
        .where(eq(policyAssets.assetId, assetId));
      return rows ?? [];
    },

    delete: async (policyId: string, assetId: string, tx?: any): Promise<void> => {
      const client = getClient(db, tx);
      await client
        .delete(policyAssets)
        .where(and(eq(policyAssets.policyId, policyId), eq(policyAssets.assetId, assetId)));
    },
  };
}

export type PolicyAssetsRepository = ReturnType<typeof createPolicyAssetsRepository>;

