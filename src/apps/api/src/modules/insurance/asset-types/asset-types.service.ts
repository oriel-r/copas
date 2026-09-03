import type { AssetTypesRepository } from './asset-types.repository';
import type { AssetType, CreateAssetTypeRequest } from '@copas/contracts';

export function createAssetTypesService(repository: AssetTypesRepository | { assetTypesRepository: AssetTypesRepository }) {
  const repo = (repository as any)?.assetTypesRepository ?? repository;
  return {
    getById: async (id: string, tx?: any): Promise<AssetType | null> => {
      return await repo.findById(id, tx);
    },

    findByCode: async (code: string, branchId?: string, tx?: any): Promise<AssetType | null> => {
      return await repo.findByCode(code, branchId, tx);
    },

    create: async (data: CreateAssetTypeRequest, tx?: any): Promise<AssetType> => {
      return await repo.create(data, tx);
    },

    findOrCreate: async (data: CreateAssetTypeRequest, tx?: any): Promise<AssetType> => {
      const existing = await repo.findByCode(data.code, data.branchId ?? undefined, tx);
      if (existing) return existing;
      return await repo.create(data, tx);
    },

    list: async (params?: { limit?: number; offset?: number }, tx?: any): Promise<AssetType[]> => {
      return await repo.list(params, tx);
    },
  };
}

export type AssetTypesService = ReturnType<typeof createAssetTypesService>;

