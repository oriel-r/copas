import type { PolicyInstallmentsRepository } from './policy-installments.repository';
import { formatAssetDescription } from '@copas/contracts';
import type { PolicyInstallment, CreatePolicyInstallmentRequest } from '@copas/contracts';

export function createPolicyInstallmentsService(repository: PolicyInstallmentsRepository | { policyInstallmentsRepository: PolicyInstallmentsRepository }) {
  const repo = (repository as any)?.policyInstallmentsRepository ?? repository;
  return {
    getById: async (id: string, tx?: any): Promise<PolicyInstallment | null> => {
      return await repo.findById(id, tx);
    },

    findByPolicyId: async (policyId: string, tx?: any): Promise<PolicyInstallment[]> => {
      return await repo.findByPolicyId(policyId, tx);
    },

    getByPolicyId: async (policyId: string, tx?: any): Promise<PolicyInstallment[]> => {
      return await repo.findByPolicyId(policyId, tx);
    },

    create: async (data: CreatePolicyInstallmentRequest | any, tx?: any): Promise<PolicyInstallment> => {
      return await repo.create(data, tx);
    },

    createMany: async (data: (CreatePolicyInstallmentRequest | any)[], tx?: any): Promise<PolicyInstallment[]> => {
      return await repo.createMany(data, tx);
    },

    createInstallments: async (installments: (CreatePolicyInstallmentRequest | any)[], tx?: any): Promise<PolicyInstallment[]> => {
      return await repo.createMany(installments, tx);
    },

    update: async (id: string, data: Partial<CreatePolicyInstallmentRequest> | any, tx?: any): Promise<PolicyInstallment> => {
      return await repo.update(id, data, tx);
    },

    updateStatus: async (id: string, status: any, tx?: any): Promise<PolicyInstallment> => {
      return await repo.update(id, { status }, tx);
    },

    delete: async (id: string, tx?: any): Promise<void> => {
      return await repo.delete(id, tx);
    },

    list: async (params?: { policyId?: string; limit?: number; offset?: number }, tx?: any): Promise<PolicyInstallment[]> => {
      return await repo.list(params, tx);
    },

    listInstallments: async (filters: any, tx?: any): Promise<any> => {
      const isFilteredByTarget = Boolean(filters.policyId || filters.insuredId || filters.status === 'all');
      const dueDate = filters.dueDate !== undefined ? filters.dueDate : (isFilteredByTarget ? undefined : new Date().toISOString().split('T')[0]);
      const status = filters.status ?? 'pending';
      const itemsRaw = await repo.findWithDetails({ ...filters, dueDate, status }, tx);
      const items = itemsRaw.map((row: any) => {
        const properties = row.assetProperties || row.properties;
        const insuredName = row.insuredFullName || row.insuredName;
        const assetTypeName = row.assetTypeName;
        const assetTypeCode = row.assetTypeCode;
        
        const { assetProperties, assetTypeName: _n, assetTypeCode: _c, insuredFullName, properties: _p, ...rest } = row;
        
        return {
          ...rest,
          insuredName,
          assetDescription: formatAssetDescription({
            properties,
            assetTypeName,
            assetTypeCode,
          }),
        };
      });
      return {
        appliedFilters: {
          dueDate: dueDate ?? null,
          status,
          companyId: filters.companyId ?? null,
          insuredId: filters.insuredId ?? null,
        },
        total: items.length,
        items,
      };
    },

    markAsPaid: async (id: string, tx?: any): Promise<any> => {
      return await repo.update(id, { status: 'paid' }, tx);
    },
  };
}

export type PolicyInstallmentsService = ReturnType<typeof createPolicyInstallmentsService>;

