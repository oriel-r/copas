import { useContext } from 'react'
import {
  QueryClientContext,
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import {
  getOrganizationWhatsAppEndpointResponseSchema,
  type GetOrganizationWhatsAppEndpointResponse,
  type UpsertOrganizationWhatsAppEndpointRequest,
} from '@copas/contracts'
import { queryClient as fallbackQueryClient } from '@/app/query-client'
import { apiClient } from '@/lib/api-client'
import { useSessionStore } from '@/lib/session'
import { useAgencySettingsStore } from '@/stores/use-agency-settings-store'
import { ApiError } from './api-error'

export const agencyWhatsAppKeys = {
  all: ['channel-endpoints', 'whatsapp'] as const,
  detail: (organizationId?: string | null) =>
    [...agencyWhatsAppKeys.all, organizationId ?? 'active'] as const,
}

export interface UseAgencyWhatsAppEndpointOptions {
  pollWhenPending?: boolean
}

export function useAgencyWhatsAppEndpoint(
  organizationId?: string | null,
  options?: UseAgencyWhatsAppEndpointOptions,
): UseQueryResult<GetOrganizationWhatsAppEndpointResponse> {
  const contextClient = useContext(QueryClientContext)
  const activeClient = contextClient ?? fallbackQueryClient
  const sessionStatus = useSessionStore((s) => s.status)
  const pollWhenPending = Boolean(options?.pollWhenPending)

  return useQuery<GetOrganizationWhatsAppEndpointResponse>(
    {
      queryKey: agencyWhatsAppKeys.detail(organizationId),
      enabled: sessionStatus === 'online',
      retry: false,
      refetchOnWindowFocus: pollWhenPending,
      refetchInterval: pollWhenPending
        ? (query) => {
            const ep = query.state.data?.endpoint
            if (!ep?.number) return false
            const isConnected = ep.connectionStatus === 'connected' || ep.status === 'active'
            return isConnected ? false : 4000
          }
        : false,
      queryFn: async () => {
        const response = await apiClient['channel-endpoints'].whatsapp.$get()
        if (!response.ok) {
          throw await ApiError.fromResponse(response)
        }
        const data = await response.json()
        return getOrganizationWhatsAppEndpointResponseSchema.parse(data)
      },
    },
    activeClient,
  )
}

export function useUpsertAgencyWhatsAppEndpoint(
  organizationId?: string | null,
  agencyName?: string | null,
): UseMutationResult<
  GetOrganizationWhatsAppEndpointResponse,
  Error,
  UpsertOrganizationWhatsAppEndpointRequest
> {
  const contextClient = useContext(QueryClientContext)
  const activeClient = contextClient ?? fallbackQueryClient
  const sessionStatus = useSessionStore((s) => s.status)
  const saveAgencyPhone = useAgencySettingsStore((s) => s.saveAgencyPhone)

  return useMutation<
    GetOrganizationWhatsAppEndpointResponse,
    Error,
    UpsertOrganizationWhatsAppEndpointRequest
  >(
    {
      mutationFn: async (payload) => {
        if (sessionStatus !== 'online') {
          saveAgencyPhone(payload.number, { organizationId, agencyName })
          return {
            endpoint: {
              endpointId: 'demo-endpoint',
              organizationChannelEndpointId: 'demo-org-endpoint',
              organizationId: organizationId ?? 'demo-org',
              number: payload.number.trim(),
              provider: 'whatsapp_cloud',
              ownerKind: 'organization',
              status: 'inactive',
              linkingStatus: 'suspended',
              connectionStatus: null,
            },
          }
        }

        const response = await apiClient['channel-endpoints'].whatsapp.$put({
          json: payload,
        })
        if (!response.ok) {
          throw await ApiError.fromResponse(response)
        }
        const data = await response.json()
        return getOrganizationWhatsAppEndpointResponseSchema.parse(data)
      },
      onSuccess: (data) => {
        if (sessionStatus === 'online') {
          activeClient.setQueryData(agencyWhatsAppKeys.detail(organizationId), data)
          void activeClient.invalidateQueries({ queryKey: agencyWhatsAppKeys.all })
        }
      },
    },
    activeClient,
  )
}
