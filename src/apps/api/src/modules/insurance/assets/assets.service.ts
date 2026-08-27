import type { D1Database } from '@cloudflare/workers-types';
import type { AssetsRepository } from './assets.repository';
import type { Asset, CreateAssetRequest } from '@copas/contracts';

export function createAssetsService(repository: AssetsRepository | { assetsRepository: AssetsRepository }) {
  const repo = (repository as any)?.assetsRepository ?? repository;
  return {
    getById: async (id: string, tx?: any): Promise<Asset | null> => {
      return await repo.findById(id, tx);
    },

    findByInsuredId: async (insuredId: string, tx?: any): Promise<Asset[]> => {
      return await repo.findByInsuredId(insuredId, tx);
    },

    findByInsuredAndType: async (insuredId: string, assetTypeId: string, tx?: any): Promise<Asset | null> => {
      if (typeof repo.findByInsuredAndType === 'function') {
        return await repo.findByInsuredAndType(insuredId, assetTypeId, tx);
      }
      const all = await repo.findByInsuredId(insuredId, tx);
      return all.find((a: any) => a.assetTypeId === assetTypeId) ?? null;
    },

    create: async (data: CreateAssetRequest | any, tx?: any): Promise<Asset> => {
      return await repo.create(data, tx);
    },

    update: async (id: string, data: Partial<CreateAssetRequest> | any, tx?: any): Promise<Asset> => {
      return await repo.update(id, data, tx);
    },

    delete: async (id: string, tx?: any): Promise<void> => {
      return await repo.delete(id, tx);
    },

    findOrCreate: async (data: CreateAssetRequest | any, tx?: any): Promise<Asset> => {
      if (data.insuredId) {
        const existingAssets: Asset[] = await repo.findByInsuredId(data.insuredId, tx);
        if (Array.isArray(existingAssets) && existingAssets.length > 0) {
          const found = existingAssets.find((a: any) => {
            if (data.assetTypeId && a.assetTypeId !== data.assetTypeId) return false;
            if (data.properties && a.properties) {
              const keys = Object.keys(data.properties);
              if (keys.length > 0) {
                return keys.every((k) => a.properties[k] === data.properties[k]);
              }
            }
            return true;
          });
          if (found) return found;
        }
      }
      return await repo.create(data, tx);
    },

    list: async (params?: { insuredId?: string; assetTypeId?: string; limit?: number; offset?: number }, tx?: any): Promise<Asset[]> => {
      return await repo.list(params, tx);
    },
  };
}

export type AssetsService = ReturnType<typeof createAssetsService>;

