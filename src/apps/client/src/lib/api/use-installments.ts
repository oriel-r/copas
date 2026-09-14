import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import { isDemoMode } from '../session';
import type {
  InstallmentsFilter,
  InstallmentsDetailedResponse,
  InstallmentDetailedItem,
  PolicyInstallment,
} from '@copas/contracts';

export const MOCK_DUE_INSTALLMENTS: InstallmentDetailedItem[] = [
  {
    installmentId: 'inst-mock-1',
    policyId: 'pol-mock-1',
    policyNumber: 'POL-2026-8812',
    installmentNumber: 3,
    insuredName: 'Gómez, Carlos Alberto',
    companyName: 'Sancor Seguros',
    assetDescription: 'TOYOTA COROLLA XEI (AF123CD) 2023',
    totalAmount: 48500,
    currency: 'ARS',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'pending',
  },
  {
    installmentId: 'inst-mock-2',
    policyId: 'pol-mock-2',
    policyNumber: 'POL-2026-4491',
    installmentNumber: 1,
    insuredName: 'Martínez, Lucía Elena',
    companyName: 'Federación Patronal',
    assetDescription: 'VOLKSWAGEN TAOS HIGHLINE (AG456EF) 2024',
    totalAmount: 72300.5,
    currency: 'ARS',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'pending',
  },
  {
    installmentId: 'inst-mock-3',
    policyId: 'pol-mock-3',
    policyNumber: 'POL-2026-1029',
    installmentNumber: 6,
    insuredName: 'Pérez, Juan Ignacio',
    companyName: 'La Segunda Seguros',
    assetDescription: 'Mitre 1250, Rosario',
    totalAmount: 31200,
    currency: 'ARS',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'pending',
  },
  {
    installmentId: 'inst-mock-4',
    policyId: 'pol-mock-4',
    policyNumber: 'POL-2026-7734',
    installmentNumber: 2,
    insuredName: 'Rodríguez, Mariana Soledad',
    companyName: 'Mercantil Andina',
    assetDescription: 'FORD RANGER XLT 4X4 (AE789GH) 2022',
    totalAmount: 89400,
    currency: 'ARS',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'pending',
  },
];

let mockItems = [...MOCK_DUE_INSTALLMENTS];

function getMockResponse(): InstallmentsDetailedResponse {
  const pending = mockItems.filter((i) => i.status === 'pending');
  return {
    appliedFilters: {
      dueDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      companyId: null,
      insuredId: null,
    },
    total: pending.length,
    items: pending,
  };
}

export function useInstallments(filters?: Partial<InstallmentsFilter>) {
  return useQuery<InstallmentsDetailedResponse, Error>({
    queryKey: ['installments', filters],
    queryFn: async () => {
      if (isDemoMode()) {
        return getMockResponse();
      }

      try {
        const query: any = {};
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              query[key] = String(value);
            }
          });
        }
        const res = await apiClient.installments.$get({ query });
        if (!res.ok) {
          if (isDemoMode() || import.meta.env.DEV) {
            return getMockResponse();
          }
          throw new Error('Failed to fetch installments');
        }
        return (await res.json()) as unknown as InstallmentsDetailedResponse;
      } catch (err) {
        if (isDemoMode() || import.meta.env.DEV) {
          return getMockResponse();
        }
        throw err;
      }
    },
    retry: false,
  });
}

export function useMarkInstallmentPaid() {
  const queryClient = useQueryClient();

  return useMutation<PolicyInstallment, Error, string>({
    mutationFn: async (id: string) => {
      if (isDemoMode()) {
        mockItems = mockItems.map((item) =>
          item.installmentId === id ? { ...item, status: 'paid' as const } : item
        );
        return {
          id,
          status: 'paid',
        } as unknown as PolicyInstallment;
      }

      try {
        const res = await apiClient.installments[':id'].$patch({
          param: { id },
          json: { status: 'paid' },
        });
        if (!res.ok) {
          if (isDemoMode() || import.meta.env.DEV) {
            mockItems = mockItems.map((item) =>
              item.installmentId === id ? { ...item, status: 'paid' as const } : item
            );
            return { id, status: 'paid' } as unknown as PolicyInstallment;
          }
          throw new Error('Failed to update installment');
        }
        return (await res.json()) as unknown as PolicyInstallment;
      } catch (err) {
        if (isDemoMode() || import.meta.env.DEV) {
          mockItems = mockItems.map((item) =>
            item.installmentId === id ? { ...item, status: 'paid' as const } : item
          );
          return { id, status: 'paid' } as unknown as PolicyInstallment;
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
    },
  });
}
