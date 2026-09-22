import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query'
import type {
  InsuredDetailResponse,
  UpdateInsuredRequest,
  InsuredResponse,
  PoliciesFilter,
  PoliciesDetailedResponse,
  UpdatePolicyRequest,
  PolicyResponse,
  InstallmentsDetailedResponse,
  PolicyInstallment,
} from '@copas/contracts'
import { apiClient } from '../api-client'
import { isDemoMode } from '../session'

export const MOCK_INSURED_DETAIL: InsuredDetailResponse = {
  id: 'i1',
  organizationId: 'org-demo',
  uploadedBy: 'user-demo',
  fullName: 'JUAN CARLOS PEREZ',
  cuit: '20123456789',
  phone: '+541112345678',
  email: 'juan@example.com',
  birthDate: '1985-05-15',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  companies: ['Sancor Seguros'],
  activePoliciesCount: 2,
  totalPoliciesCount: 2,
  latestPolicy: {
    id: 'p1',
    policyNumber: 'POL-123',
    companyId: 'c1',
    companyName: 'Sancor Seguros',
    branchId: 'b1',
    branchName: 'Automotores',
    assetDescription: 'Toyota Corolla 2022',
    startDate: '2025-01-01',
    endDate: '2026-01-01',
    status: 'active',
  },
}

export const MOCK_ADDITIONAL_POLICIES: PoliciesDetailedResponse = {
  total: 2,
  items: [
    {
      id: 'p1',
      policyNumber: 'POL-123',
      companyId: 'c1',
      companyName: 'Sancor Seguros',
      branchId: 'b1',
      branchName: 'Automotores',
      assetDescription: 'Toyota Corolla 2022',
      startDate: '2025-01-01',
      endDate: '2026-01-01',
      status: 'active',
      premiumTotal: 120000,
      currency: 'ARS',
      billingFrequency: 'monthly',
    },
    {
      id: 'p2',
      policyNumber: 'POL-789',
      companyId: 'c1',
      companyName: 'Sancor Seguros',
      branchId: 'b2',
      branchName: 'Hogar',
      assetDescription: 'Casa en Country San Diego',
      startDate: '2024-06-01',
      endDate: '2025-06-01',
      status: 'expired',
      premiumTotal: 95000,
      currency: 'ARS',
      billingFrequency: 'monthly',
    },
  ],
}

export const MOCK_POLICY_INSTALLMENTS: Record<string, InstallmentsDetailedResponse> = {
  p1: {
    appliedFilters: {
      dueDate: null,
      status: 'all',
      companyId: null,
      insuredId: null,
    },
    total: 3,
    items: [
      {
        installmentId: 'inst-1',
        policyId: 'p1',
        insuredId: 'i1',
        policyNumber: 'POL-123',
        installmentNumber: 1,
        insuredName: 'JUAN CARLOS PEREZ',
        companyName: 'Sancor Seguros',
        assetDescription: 'Toyota Corolla 2022',
        totalAmount: 10000,
        currency: 'ARS',
        dueDate: '2025-01-10',
        status: 'paid',
      },
      {
        installmentId: 'inst-2',
        policyId: 'p1',
        insuredId: 'i1',
        policyNumber: 'POL-123',
        installmentNumber: 2,
        insuredName: 'JUAN CARLOS PEREZ',
        companyName: 'Sancor Seguros',
        assetDescription: 'Toyota Corolla 2022',
        totalAmount: 10000,
        currency: 'ARS',
        dueDate: '2025-02-10',
        status: 'pending',
      },
      {
        installmentId: 'inst-3',
        policyId: 'p1',
        insuredId: 'i1',
        policyNumber: 'POL-123',
        installmentNumber: 3,
        insuredName: 'JUAN CARLOS PEREZ',
        companyName: 'Sancor Seguros',
        assetDescription: 'Toyota Corolla 2022',
        totalAmount: 10000,
        currency: 'ARS',
        dueDate: '2025-03-10',
        status: 'overdue',
      },
    ],
  },
}

let mockInsuredState = { ...MOCK_INSURED_DETAIL }

export function useInsuredDetail(id: string | null): UseQueryResult<InsuredDetailResponse, Error> {
  return useQuery<InsuredDetailResponse, Error>({
    queryKey: ['insured', id],
    queryFn: async () => {
      if (!id) throw new Error('Insured ID is required')
      if (isDemoMode()) {
        return { ...mockInsuredState, id }
      }
      const res = await (apiClient.insureds as any)[':id'].$get({
        param: { id },
      })
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Asegurado no encontrado')
        }
        throw new Error('Error al cargar datos del asegurado')
      }
      return (await res.json()) as InsuredDetailResponse
    },
    enabled: Boolean(id),
  })
}

export function useUpdateInsured(): UseMutationResult<
  InsuredResponse,
  Error,
  { id: string; data: UpdateInsuredRequest }
> {
  const queryClient = useQueryClient()

  return useMutation<InsuredResponse, Error, { id: string; data: UpdateInsuredRequest }>({
    mutationFn: async ({ id, data }) => {
      if (isDemoMode()) {
        mockInsuredState = {
          ...mockInsuredState,
          ...data,
          fullName: data.fullName ?? mockInsuredState.fullName,
        }
        return mockInsuredState as unknown as InsuredResponse
      }

      const res = await (apiClient.insureds as any)[':id'].$patch({
        param: { id },
        json: data,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        if (res.status === 409) {
          throw new Error(errData.message || 'El CUIT ya se encuentra registrado')
        }
        const issuesMsg = Array.isArray(errData.details)
          ? errData.details.map((d: any) => d.message).join(', ')
          : Array.isArray(errData.error?.issues)
          ? errData.error.issues.map((i: any) => i.message).join(', ')
          : null
        throw new Error(issuesMsg || errData.message || errData.error || 'Error al actualizar asegurado')
      }
      return (await res.json()) as InsuredResponse
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['insureds'] })
      queryClient.invalidateQueries({ queryKey: ['insured', variables.id] })
    },
  })
}

export function usePoliciesByInsured(
  insuredId: string | null,
  filters?: Partial<PoliciesFilter>
): UseQueryResult<PoliciesDetailedResponse, Error> {
  return useQuery<PoliciesDetailedResponse, Error>({
    queryKey: ['policies', { insuredId, ...filters }],
    queryFn: async () => {
      if (!insuredId) throw new Error('Insured ID is required')
      if (isDemoMode()) {
        return MOCK_ADDITIONAL_POLICIES
      }

      const query: Record<string, string> = { insuredId }
      if (filters?.limit) query.limit = String(filters.limit)
      if (filters?.offset) query.offset = String(filters.offset)
      if (filters?.status) query.status = String(filters.status)

      const res = await apiClient.policies.$get({ query: query as any })
      if (!res.ok) {
        throw new Error('Error al cargar pólizas')
      }
      return (await res.json()) as unknown as PoliciesDetailedResponse
    },
    enabled: Boolean(insuredId),
  })
}

export function useUpdatePolicy(): UseMutationResult<
  PolicyResponse,
  Error,
  { id: string; insuredId: string; data: Partial<UpdatePolicyRequest> }
> {
  const queryClient = useQueryClient()

  return useMutation<PolicyResponse, Error, { id: string; insuredId: string; data: Partial<UpdatePolicyRequest> }>({
    mutationFn: async ({ id, data }) => {
      if (isDemoMode()) {
        return { id, ...data } as unknown as PolicyResponse
      }

      const res = await (apiClient.policies as any)[':id'].$patch({
        param: { id },
        json: data,
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const issuesMsg = Array.isArray(errData.details)
          ? errData.details.map((d: any) => d.message).join(', ')
          : Array.isArray(errData.error?.issues)
          ? errData.error.issues.map((i: any) => i.message).join(', ')
          : null
        throw new Error(issuesMsg || errData.message || errData.error || 'Error al actualizar póliza')
      }
      return (await res.json()) as PolicyResponse
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['insured', variables.insuredId] })
      queryClient.invalidateQueries({ queryKey: ['policies', { insuredId: variables.insuredId }] })
      queryClient.invalidateQueries({ queryKey: ['insureds'] })
    },
  })
}

export function usePolicyInstallments(
  policyId: string | null
): UseQueryResult<InstallmentsDetailedResponse, Error> {
  return useQuery<InstallmentsDetailedResponse, Error>({
    queryKey: ['installments', { policyId }],
    queryFn: async () => {
      if (!policyId) throw new Error('Policy ID is required')
      if (isDemoMode()) {
        return (
          MOCK_POLICY_INSTALLMENTS[policyId] || {
            appliedFilters: { dueDate: null, status: 'all', companyId: null, insuredId: null },
            total: 0,
            items: [],
          }
        )
      }

      const res = await apiClient.installments.$get({
        query: { policyId, status: 'all' as any },
      })
      if (!res.ok) {
        throw new Error('Error al cargar cuotas')
      }
      return (await res.json()) as unknown as InstallmentsDetailedResponse
    },
    enabled: Boolean(policyId),
  })
}

export function useToggleInstallmentStatus(): UseMutationResult<
  PolicyInstallment,
  Error,
  { installmentId: string; policyId: string; currentStatus: string }
> {
  const queryClient = useQueryClient()

  return useMutation<PolicyInstallment, Error, { installmentId: string; policyId: string; currentStatus: string }>({
    mutationFn: async ({ installmentId, currentStatus }) => {
      const newStatus = currentStatus === 'paid' ? 'pending' : 'paid'

      if (isDemoMode()) {
        return {
          id: installmentId,
          status: newStatus,
        } as unknown as PolicyInstallment
      }

      const res = await (apiClient.installments as any)[':id'].$patch({
        param: { id: installmentId },
        json: { status: newStatus },
      })
      if (!res.ok) {
        throw new Error('Error al actualizar estado de cuota')
      }
      return (await res.json()) as unknown as PolicyInstallment
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['installments', { policyId: variables.policyId }] })
    },
  })
}
