import type { D1Database } from '@cloudflare/workers-types';
import type { PaymentMethodsRepository } from './payment-methods.repository';
import type { PaymentMethod, CreatePaymentMethodRequest } from '@copas/contracts';

export function createPaymentMethodsService(repository: PaymentMethodsRepository | { paymentMethodsRepository: PaymentMethodsRepository }) {
  const repo = (repository as any)?.paymentMethodsRepository ?? repository;
  return {
    getById: async (id: string, tx?: any): Promise<PaymentMethod | null> => {
      return await repo.findById(id, tx);
    },

    findByCode: async (code: string, tx?: any): Promise<PaymentMethod | null> => {
      return await repo.findByCode(code, tx);
    },

    findByName: async (name: string, tx?: any): Promise<PaymentMethod | null> => {
      return await repo.findByName(name, tx);
    },

    create: async (data: CreatePaymentMethodRequest, tx?: any): Promise<PaymentMethod> => {
      return await repo.create(data, tx);
    },

    findOrCreate: async (data: { name?: string; code?: string; type?: string } | any, tx?: any): Promise<PaymentMethod> => {
      const code = data.code || data.type || data.name;
      const name = data.name || data.type || data.code || 'UNKNOWN';
      if (code && typeof code === 'string' && code.trim() !== '') {
        if (typeof repo.findByCode === 'function') {
          const found = await repo.findByCode(code, tx);
          if (found) return found;
        }
      }
      if (name && typeof name === 'string' && name.trim() !== '') {
        if (typeof repo.findByName === 'function') {
          const found = await repo.findByName(name, tx);
          if (found) return found;
        }
      }
      return await repo.create({ code: code || name, name: name || code }, tx);
    },

    list: async (params?: { limit?: number; offset?: number }, tx?: any): Promise<PaymentMethod[]> => {
      return await repo.list(params, tx);
    },
  };
}

export type PaymentMethodsService = ReturnType<typeof createPaymentMethodsService>;

