import type { BranchesRepository } from './branches.repository';
import type { Branch, CreateBranchRequest } from '@copas/contracts';

export function createBranchesService(repository: BranchesRepository | { branchesRepository: BranchesRepository }) {
  const repo = (repository as any)?.branchesRepository ?? repository;
  return {
    getById: async (id: string, tx?: any): Promise<Branch | null> => {
      return await repo.findById(id, tx);
    },

    findByCode: async (code: string, tx?: any): Promise<Branch | null> => {
      return await repo.findByCode(code, tx);
    },

    create: async (data: CreateBranchRequest, tx?: any): Promise<Branch> => {
      return await repo.create(data, tx);
    },

    findOrCreate: async (data: CreateBranchRequest, tx?: any): Promise<Branch> => {
      const existing = await repo.findByCode(data.code, tx);
      if (existing) return existing;
      return await repo.create(data, tx);
    },

    list: async (params?: { limit?: number; offset?: number }, tx?: any): Promise<Branch[]> => {
      return await repo.list(params, tx);
    },
  };
}

export type BranchesService = ReturnType<typeof createBranchesService>;


