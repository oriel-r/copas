import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import { policyInstallments } from '@copas/db';
import type { PolicyInstallment, CreatePolicyInstallmentRequest } from '@copas/contracts';

function getClient(db: any, tx?: any) {
  if (tx) {
    return typeof tx.prepare === 'function' ? drizzle(tx) : tx;
  }
  const base = db?.db ?? db;
  return typeof base?.prepare === 'function' ? drizzle(base) : base;
}

export function createPolicyInstallmentsRepository(db: D1Database | any, organizationId: string = 'default') {
  return {
    findById: async (id: string, tx?: any): Promise<PolicyInstallment | null> => {
      const client = getClient(db, tx);
      const rows = await client
        .select()
        .from(policyInstallments)
        .where(and(eq(policyInstallments.organizationId, organizationId), eq(policyInstallments.id, id)))
        .limit(1);
      return rows?.[0] ?? null;
    },

    findByPolicyId: async (policyId: string, tx?: any): Promise<PolicyInstallment[]> => {
      const client = getClient(db, tx);
      let q = client
        .select()
        .from(policyInstallments)
        .where(and(eq(policyInstallments.organizationId, organizationId), eq(policyInstallments.policyId, policyId)));
      if (typeof q.orderBy === 'function') {
        q = q.orderBy(policyInstallments.installmentNumber);
      }
      const rows = await q;
      return Array.isArray(rows) ? rows : [];
    },

    create: async (data: CreatePolicyInstallmentRequest | any, tx?: any): Promise<PolicyInstallment> => {
      const client = getClient(db, tx);
      const rows = await client
        .insert(policyInstallments)
        .values({
          organizationId: data.organizationId || organizationId,
          policyId: data.policyId,
          uploadedBy: data.uploadedBy || 'system',
          installmentNumber: data.installmentNumber ?? data.installment_number,
          dueDate: data.dueDate || data.due_date || null,
          totalAmount: data.totalAmount ?? data.total_amount ?? null,
          currency: data.currency || null,
          status: data.status || 'pending',
        })
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    createMany: async (data: (CreatePolicyInstallmentRequest | any)[], tx?: any): Promise<PolicyInstallment[]> => {
      if (!data || data.length === 0) return [];
      const client = getClient(db, tx);
      const values = data.map((d) => ({
        organizationId: d.organizationId || organizationId,
        policyId: d.policyId,
        uploadedBy: d.uploadedBy || 'system',
        installmentNumber: d.installmentNumber ?? d.installment_number,
        dueDate: d.dueDate || d.due_date || null,
        totalAmount: d.totalAmount ?? d.total_amount ?? null,
        currency: d.currency || null,
        status: d.status || 'pending',
      }));
      const rows = await client
        .insert(policyInstallments)
        .values(values)
        .returning();
      return Array.isArray(rows) ? rows : [rows];
    },

    update: async (id: string, data: Partial<CreatePolicyInstallmentRequest> | any, tx?: any): Promise<PolicyInstallment> => {
      const client = getClient(db, tx);
      const rows = await client
        .update(policyInstallments)
        .set(data)
        .where(and(eq(policyInstallments.organizationId, organizationId), eq(policyInstallments.id, id)))
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    },

    delete: async (id: string, tx?: any): Promise<void> => {
      const client = getClient(db, tx);
      await client
        .delete(policyInstallments)
        .where(and(eq(policyInstallments.organizationId, organizationId), eq(policyInstallments.id, id)));
    },

    list: async (params?: { policyId?: string; limit?: number; offset?: number }, tx?: any): Promise<PolicyInstallment[]> => {
      const client = getClient(db, tx);
      let q = client.select().from(policyInstallments);
      if (params?.policyId) {
        q = q.where(and(eq(policyInstallments.organizationId, organizationId), eq(policyInstallments.policyId, params.policyId)));
      } else {
        q = q.where(eq(policyInstallments.organizationId, organizationId));
      }
      const rows = await q.limit(params?.limit ?? 50).offset(params?.offset ?? 0);
      return rows ?? [];
    },
  };
}

export type PolicyInstallmentsRepository = ReturnType<typeof createPolicyInstallmentsRepository>;

