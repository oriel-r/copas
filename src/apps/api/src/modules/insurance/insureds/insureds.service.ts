import type { D1Database } from '@cloudflare/workers-types';
import type { InsuredsRepository } from './insureds.repository';
import type { Insured, CreateInsuredRequest } from '@copas/contracts';

export function createInsuredsService(repository: InsuredsRepository | { insuredsRepository: InsuredsRepository }) {
  const repo = (repository as any)?.insuredsRepository ?? repository;
  return {
    getById: async (id: string, tx?: any): Promise<Insured | null> => {
      return await repo.findById(id, tx);
    },

    findByCuit: async (orgIdOrCuit: string, cuitOrTx?: string | any, tx?: any): Promise<Insured | null> => {
      if (typeof cuitOrTx === 'string') {
        return await repo.findByCuit(orgIdOrCuit, cuitOrTx, tx);
      }
      return await repo.findByCuit(orgIdOrCuit, cuitOrTx);
    },

    create: async (data: CreateInsuredRequest | any, tx?: any): Promise<Insured> => {
      return await repo.create(data, tx);
    },

    update: async (id: string, data: Partial<CreateInsuredRequest> | any, tx?: any): Promise<Insured> => {
      return await repo.update(id, data, tx);
    },

    findOrCreate: async (data: CreateInsuredRequest | any, tx?: any): Promise<Insured> => {
      const orgId = data.organizationId ?? data.organization_id;
      const cuit = data.cuit;
      if (cuit && typeof cuit === 'string' && cuit.trim() !== '') {
        const existing = orgId
          ? await repo.findByCuit(orgId, cuit, tx)
          : await repo.findByCuit(cuit, tx);
        if (existing) return existing;
      }
      return await repo.create(data, tx);
    },

    list: async (params?: { limit?: number; offset?: number }, tx?: any): Promise<Insured[]> => {
      return await repo.list(params, tx);
    },
  };
}

export type InsuredsService = ReturnType<typeof createInsuredsService>;

