import { useQuery } from '@tanstack/react-query'
import type { InsuredsFilter, InsuredsDetailedResponse, InsuredFilterOptions } from '@copas/contracts'
import { apiClient } from '../api-client'
import { isDemoMode } from '../session'

const MOCK_FILTER_OPTIONS: InsuredFilterOptions = {
  companies: [
    { id: 'c1', name: 'Sancor Seguros' },
    { id: 'c2', name: 'Federación Patronal' }
  ],
  branches: [
    { id: 'b1', name: 'Automotores' },
    { id: 'b2', name: 'Hogar' }
  ]
}

const MOCK_INSUREDS: InsuredsDetailedResponse = {
  total: 2,
  items: [
    {
      id: 'i1',
      fullName: 'JUAN CARLOS PEREZ',
      cuit: '20123456789',
      phone: '+541112345678',
      email: 'juan@example.com',
      companies: ['Sancor Seguros'],
      activePoliciesCount: 1,
      policies: [
        {
          id: 'p1',
          policyNumber: 'POL-123',
          companyId: 'c1',
          companyName: 'Sancor Seguros',
          branchId: 'b1',
          branchName: 'Automotores',
          assetDescription: 'Toyota Corolla 2022',
          startDate: '2023-01-01',
          endDate: '2024-01-01',
          status: 'active'
        }
      ]
    },
    {
      id: 'i2',
      fullName: 'ANA MARIA GOMEZ',
      cuit: '27876543219',
      phone: '+541187654321',
      email: 'ana@example.com',
      companies: ['Federación Patronal'],
      activePoliciesCount: 1,
      policies: [
        {
          id: 'p2',
          policyNumber: 'POL-456',
          companyId: 'c2',
          companyName: 'Federación Patronal',
          branchId: 'b2',
          branchName: 'Hogar',
          assetDescription: 'Casa en Pilar',
          startDate: '2023-05-01',
          endDate: '2024-05-01',
          status: 'active'
        }
      ]
    }
  ]
}

export const useInsureds = (filters?: Partial<InsuredsFilter>) => {
  return useQuery({
    queryKey: ['insureds', filters],
    queryFn: async (): Promise<InsuredsDetailedResponse> => {
      if (isDemoMode()) {
        return new Promise(resolve => setTimeout(() => resolve(MOCK_INSUREDS), 500))
      }
      
      const queryParams: Record<string, string> = {}
      if (filters?.companyId) queryParams.companyId = filters.companyId
      if (filters?.branchId) queryParams.branchId = filters.branchId
      if (filters?.policyStatus) queryParams.policyStatus = filters.policyStatus
      if (filters?.limit !== undefined) queryParams.limit = String(filters.limit)
      if (filters?.offset !== undefined) queryParams.offset = String(filters.offset)
        
      const res = await apiClient.insureds.$get({ query: queryParams as any })
      if (!res.ok) {
        throw new Error('Failed to fetch insureds')
      }
      return await res.json()
    }
  })
}

export const useInsuredFilterOptions = () => {
  return useQuery({
    queryKey: ['insureds-filter-options'],
    queryFn: async (): Promise<InsuredFilterOptions> => {
      if (isDemoMode()) {
        return new Promise(resolve => setTimeout(() => resolve(MOCK_FILTER_OPTIONS), 500))
      }
      
      const res = await apiClient.insureds['filter-options'].$get()
      if (!res.ok) {
        throw new Error('Failed to fetch filter options')
      }
      return await res.json()
    }
  })
}
