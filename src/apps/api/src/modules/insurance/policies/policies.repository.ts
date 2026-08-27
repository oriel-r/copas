import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import { policies, aiExtractionResults } from '@copas/db';
import type { Policy, CreatePolicyRequest, AiExtractionResultInsert, AiExtractionResultUpdate } from '@copas/contracts';

function getClient(db: any, tx?: any) {
  if (tx) {
    return typeof tx.prepare === 'function' ? drizzle(tx) : tx;
  }
  const base = db?.db ?? db;
  return typeof base?.prepare === 'function' ? drizzle(base) : base;
}

export function createPoliciesRepository(db: D1Database | any, tenantId: string) {
  return {
    findById: async (id: string, tx?: any): Promise<Policy | null> => {
      const client = getClient(db, tx);
      const rows = await client
        .select()
        .from(policies)
        .where(and(eq(policies.organizationId, tenantId), eq(policies.id, id)))
        .limit(1);
      return rows?.[0] ?? null;
    },

    findByNumber: async (orgId: string, companyId: string, policyNumber: string, tx?: any): Promise<Policy | null> => {
      const client = getClient(db, tx);
      const rows = await client
        .select()
        .from(policies)
        .where(and(eq(policies.organizationId, orgId), eq(policies.companyId, companyId), eq(policies.policyNumber, policyNumber)))
        .limit(1);
      return rows?.[0] ?? null;
    },

    createPolicy: async (data: CreatePolicyRequest | any, tx?: any): Promise<Policy | any> => {
      const client = getClient(db, tx);
      const rows = await client
        .insert(policies)
        .values({
          organizationId: data.organizationId || tenantId,
          companyId: data.companyId,
          insuredId: data.insuredId,
          paymentMethodId: data.paymentMethodId || null,
          uploadedBy: data.uploadedBy || 'system',
          producedBy: data.producedBy || null,
          policyNumber: data.policyNumber || '',
          premiumTotal: data.premiumTotal ?? null,
          currency: data.currency || null,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
          effectiveEndDate: data.effectiveEndDate || null,
          status: data.status || 'active',
          billingFrequency: data.billingFrequency || null,
        })
        .returning();
      const res = Array.isArray(rows) ? rows[0] : rows;
      return res?.id ? res : (typeof res === 'string' ? { id: res } : res);
    },

    create: async (data: CreatePolicyRequest | any, tx?: any): Promise<Policy | any> => {
      const client = getClient(db, tx);
      const rows = await client
        .insert(policies)
        .values({
          organizationId: data.organizationId || tenantId,
          companyId: data.companyId,
          insuredId: data.insuredId,
          paymentMethodId: data.paymentMethodId || null,
          uploadedBy: data.uploadedBy || 'system',
          producedBy: data.producedBy || null,
          policyNumber: data.policyNumber || '',
          premiumTotal: data.premiumTotal ?? null,
          currency: data.currency || null,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
          effectiveEndDate: data.effectiveEndDate || null,
          status: data.status || 'active',
          billingFrequency: data.billingFrequency || null,
        })
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    update: async (id: string, data: Partial<CreatePolicyRequest> | any, tx?: any): Promise<Policy> => {
      const client = getClient(db, tx);
      const rows = await client
        .update(policies)
        .set(data)
        .where(and(eq(policies.organizationId, tenantId), eq(policies.id, id)))
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    delete: async (id: string, tx?: any): Promise<void> => {
      const client = getClient(db, tx);
      await client
        .delete(policies)
        .where(and(eq(policies.organizationId, tenantId), eq(policies.id, id)));
    },

    list: async (params?: { insuredId?: string; companyId?: string; limit?: number; offset?: number }, tx?: any): Promise<Policy[]> => {
      const client = getClient(db, tx);
      let q = client.select().from(policies).where(eq(policies.organizationId, tenantId));
      if (params?.insuredId) {
        q = q.where(and(eq(policies.organizationId, tenantId), eq(policies.insuredId, params.insuredId)));
      }
      if (params?.companyId) {
        q = q.where(and(eq(policies.organizationId, tenantId), eq(policies.companyId, params.companyId)));
      }
      const rows = await q.limit(params?.limit ?? 50).offset(params?.offset ?? 0);
      return rows ?? [];
    },

    createExtractionResult: async (data: AiExtractionResultInsert | any, tx?: any): Promise<any> => {
      const client = getClient(db, tx);
      const rows = await client
        .insert(aiExtractionResults)
        .values({
          documentUrl: data.documentUrl,
          status: data.status || 'pending',
          result: data.result || null,
          corrections: data.corrections || null,
          reviewedBy: data.reviewedBy || null,
          reviewedAt: data.reviewedAt || null,
          model: data.model || null,
          policyId: data.policyId || null,
        })
        .returning();
      const res = Array.isArray(rows) ? rows[0] : rows;
      return res?.id ?? res;
    },

    updateExtractionResult: async (id: string, data: AiExtractionResultUpdate | any, tx?: any): Promise<any> => {
      const client = getClient(db, tx);
      const rows = await client
        .update(aiExtractionResults)
        .set(data)
        .where(eq(aiExtractionResults.id, id))
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    getExtractionResult: async (id: string, tx?: any): Promise<any> => {
      const client = getClient(db, tx);
      const rows = await client
        .select()
        .from(aiExtractionResults)
        .where(eq(aiExtractionResults.id, id))
        .limit(1);
      return rows?.[0] ?? null;
    },
  };
}

export type PoliciesRepository = ReturnType<typeof createPoliciesRepository>;

