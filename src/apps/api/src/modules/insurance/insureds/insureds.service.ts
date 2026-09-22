import type { InsuredsRepository } from './insureds.repository';
import type { Insured, CreateInsuredRequest, UpdateInsuredRequest, InsuredsFilter, InsuredsDetailedResponse, InsuredFilterOptions, InsuredDetailResponse } from '@copas/contracts';

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

    listDetailed: async (filters: InsuredsFilter, tx?: any): Promise<InsuredsDetailedResponse> => {
      return await repo.findWithDetails(filters, tx);
    },

    getFilterOptions: async (tx?: any): Promise<InsuredFilterOptions> => {
      return await repo.getFilterOptions(tx);
    },

    getDetailById: async (id: string, tx?: any): Promise<InsuredDetailResponse | null> => {
      const res: any = await repo.findByIdWithDetails(id, tx);
      if (!res) return null;
      if (res.activePoliciesCount === undefined && res.policies) {
        const policiesList = res.policies || [];
        const companiesList = policiesList.map((p: any) => p.companyName).filter(Boolean);
        const activePoliciesCount = policiesList.filter((p: any) => p.status === 'active').length;
        let latestPolicy = null;
        if (policiesList.length > 0) {
          const active = policiesList.filter((p: any) => p.status === 'active');
          const selected = active.length > 0 ? active : policiesList;
          latestPolicy = selected.sort((a: any, b: any) => new Date(b.startDate || b.createdAt).getTime() - new Date(a.startDate || a.createdAt).getTime())[0] || null;
        }
        return {
          ...res,
          companies: Array.from(new Set(companiesList)),
          activePoliciesCount,
          totalPoliciesCount: policiesList.length,
          latestPolicy
        };
      }
      return res;
    },

    updateProfile: async (id: string, data: UpdateInsuredRequest, tx?: any): Promise<Insured | null> => {
      const existing = await repo.findById(id, tx);
      if (!existing || existing.deletedAt) {
        return null;
      }
      if (data.cuit !== undefined && data.cuit !== null && data.cuit.trim() !== '') {
        if (data.cuit !== existing.cuit) {
          const conflict = await repo.findByCuitExcludingId(existing.organizationId, data.cuit, id, tx);
          if (conflict) {
            throw new Error('CUIT already registered');
          }
        }
      }
      return await repo.update(id, data, tx);
    },
  };
}

export type InsuredsService = ReturnType<typeof createInsuredsService>;

