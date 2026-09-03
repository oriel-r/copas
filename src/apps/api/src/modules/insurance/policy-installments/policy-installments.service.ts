import type { PolicyInstallmentsRepository } from './policy-installments.repository';
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
  };
}

export type PolicyInstallmentsService = ReturnType<typeof createPolicyInstallmentsService>;

