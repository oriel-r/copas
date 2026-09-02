import type { D1Database } from '@cloudflare/workers-types';
import type { CompaniesRepository } from './companies.repository';
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '@copas/contracts';

export function createCompaniesService(repository: CompaniesRepository | { companiesRepository: CompaniesRepository }) {
  const repo = (repository as any)?.companiesRepository ?? repository;
  return {
    getById: async (id: string, tx?: any): Promise<Company | null> => {
      return await repo.findById(id, tx);
    },

    findByCode: async (code: string, tx?: any): Promise<Company | null> => {
      return await repo.findByCode(code, tx);
    },

    findByName: async (name: string, tx?: any): Promise<Company | null> => {
      return await repo.findByName(name, tx);
    },

    create: async (data: CreateCompanyRequest, tx?: any): Promise<Company> => {
      return await repo.create(data, tx);
    },

    update: async (id: string, data: UpdateCompanyRequest | any, tx?: any): Promise<Company> => {
      return await repo.update(id, data, tx);
    },

    findOrCreate: async (data: { name: string; code?: string }, tx?: any): Promise<Company> => {
      if (data.code && data.code.trim() !== '') {
        const found = await repo.findByCode(data.code, tx);
        if (found) return found;
      }
      if (data.name && data.name.trim() !== '') {
        const found = await repo.findByName(data.name, tx);
        if (found) return found;
      }
      const code = data.code && data.code.trim() !== '' ? data.code : data.name;
      const name = data.name && data.name.trim() !== '' ? data.name : (data.code || '');
      return await repo.create({ code, name }, tx);
    },

    list: async (params?: { limit?: number; offset?: number }, tx?: any): Promise<Company[]> => {
      return await repo.list(params, tx);
    },
  };
}
export type CompaniesService = ReturnType<typeof createCompaniesService>;
