import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { OrganizationWhatsAppEndpoint } from '@copas/contracts'
import { DEMO_SESSION, useSessionStore } from '@/lib/session'
import { useAgencySettingsStore } from '@/stores/use-agency-settings-store'
import { AgencySettingsDrawer } from '@/components/settings'
import {
  useAgencyWhatsAppEndpoint,
  useUpsertAgencyWhatsAppEndpoint,
} from './use-agency-whatsapp-endpoint'

const apiMocks = vi.hoisted(() => ({
  getWhatsAppEndpoint: vi.fn(),
  putWhatsAppEndpoint: vi.fn(),
}))

const toastCalls = vi.hoisted(() => [] as Array<{ name: string; args: unknown[] }>)

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    'channel-endpoints': {
      whatsapp: {
        $get: apiMocks.getWhatsAppEndpoint,
        $put: apiMocks.putWhatsAppEndpoint,
      },
    },
  },
}))

vi.mock('@/lib/toast', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  const wrapFn = (name: string, fn: (...args: unknown[]) => unknown) =>
    vi.fn((...args: unknown[]) => {
      toastCalls.push({ name, args })
      return fn(...args)
    })

  const mocked: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(actual)) {
    if (typeof value === 'function') {
      const wrapped = wrapFn(key, value as (...args: unknown[]) => unknown)
      for (const [subKey, subVal] of Object.entries(value as unknown as Record<string, unknown>)) {
        ;(wrapped as unknown as Record<string, unknown>)[subKey] =
          typeof subVal === 'function'
            ? wrapFn(`${key}.${subKey}`, subVal as (...args: unknown[]) => unknown)
            : subVal
      }
      mocked[key] = wrapped
    } else if (value && typeof value === 'object') {
      const wrappedObj: Record<string, unknown> = { ...(value as Record<string, unknown>) }
      for (const [subKey, subVal] of Object.entries(value as Record<string, unknown>)) {
        if (typeof subVal === 'function') {
          wrappedObj[subKey] = wrapFn(`${key}.${subKey}`, subVal as (...args: unknown[]) => unknown)
        }
      }
      mocked[key] = wrappedObj
    } else {
      mocked[key] = value
    }
  }
  return mocked
})

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

function setOnlineSession(organizationId = 'org-1') {
  useSessionStore.setState({
    status: 'online',
    demoSession: null,
    realSession: {
      data: {
        user: { id: 'usr-1', email: 'pas@example.com' },
        session: { id: 'ses-1', activeOrganizationId: organizationId },
      },
      isPending: false,
      error: null,
    } as any,
  })
}

function setOfflineSession() {
  useSessionStore.setState({
    status: 'offline',
    demoSession: DEMO_SESSION,
    realSession: null,
  })
}

function makeEndpoint(
  overrides: Partial<OrganizationWhatsAppEndpoint> = {},
): OrganizationWhatsAppEndpoint {
  return {
    endpointId: 'cep-org-1',
    organizationChannelEndpointId: 'oce-org-1',
    organizationId: 'org-1',
    number: '+54 9 11 1234-5678',
    provider: 'whatsapp_cloud',
    ownerKind: 'organization',
    status: 'inactive',
    linkingStatus: 'suspended',
    ...overrides,
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('use-agency-whatsapp-endpoint & AgencySettingsDrawer (online/offline)', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    toastCalls.length = 0
    queryClient = createQueryClient()
    useAgencySettingsStore.getState().reset()
    useSessionStore.setState({ status: 'checking', demoSession: null, realSession: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useAgencySettingsStore.getState().reset()
    useSessionStore.setState({ status: 'checking', demoSession: null, realSession: null })
  })

  describe('useAgencyWhatsAppEndpoint', () => {
    it('fetches GET endpoint via apiClient when status is online and returns endpoint', async () => {
      setOnlineSession('org-1')
      const endpoint = makeEndpoint({ status: 'active', linkingStatus: 'active' })
      apiMocks.getWhatsAppEndpoint.mockResolvedValueOnce(jsonResponse({ endpoint }))

      const { result } = renderHook(() => useAgencyWhatsAppEndpoint(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(apiMocks.getWhatsAppEndpoint).toHaveBeenCalledOnce()
      expect(result.current.data).toEqual({ endpoint })
    })

    it('returns { endpoint: null } when GET endpoint responds with { endpoint: null } in online mode', async () => {
      setOnlineSession('org-1')
      apiMocks.getWhatsAppEndpoint.mockResolvedValueOnce(jsonResponse({ endpoint: null }))

      const { result } = renderHook(() => useAgencyWhatsAppEndpoint(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(apiMocks.getWhatsAppEndpoint).toHaveBeenCalledOnce()
      expect(result.current.data).toEqual({ endpoint: null })
    })

    it('does NOT call apiClient.$get when status is offline (demo mode)', async () => {
      setOfflineSession()

      const { result } = renderHook(() => useAgencyWhatsAppEndpoint(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle')
      })

      expect(apiMocks.getWhatsAppEndpoint).not.toHaveBeenCalled()
    })
  })

  describe('useUpsertAgencyWhatsAppEndpoint', () => {
    it('calls apiClient.$put with { json: { number } } in online mode', async () => {
      setOnlineSession('org-1')
      const saved = makeEndpoint({ number: '+54 9 11 9999-0000', status: 'inactive' })
      apiMocks.putWhatsAppEndpoint.mockResolvedValueOnce(jsonResponse({ endpoint: saved }))

      const { result } = renderHook(() => useUpsertAgencyWhatsAppEndpoint(), {
        wrapper: createWrapper(queryClient),
      })

      let responseData: unknown
      await act(async () => {
        responseData = await result.current.mutateAsync({ number: '+54 9 11 9999-0000' })
      })

      expect(apiMocks.putWhatsAppEndpoint).toHaveBeenCalledOnce()
      expect(apiMocks.putWhatsAppEndpoint).toHaveBeenCalledWith({
        json: { number: '+54 9 11 9999-0000' },
      })
      expect(responseData).toEqual({ endpoint: saved })
    })

    it('persists into useAgencySettingsStore in memory without calling $put when status is offline', async () => {
      setOfflineSession()

      const { result } = renderHook(() => useUpsertAgencyWhatsAppEndpoint(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        await result.current.mutateAsync({ number: '+54 9 11 4444-5555' })
      })

      expect(apiMocks.putWhatsAppEndpoint).not.toHaveBeenCalled()
      const storeState = useAgencySettingsStore.getState() as unknown as Record<string, unknown>
      expect(JSON.stringify(storeState)).toContain('+54 9 11 4444-5555')
    })
  })

  describe('AgencySettingsDrawer in online mode', () => {
    it('displays "Vinculado" badge and pre-fills input when endpoint.status is active', async () => {
      setOnlineSession('org-1')
      const endpoint = makeEndpoint({
        number: '+54 9 11 2222-3333',
        status: 'active',
        linkingStatus: 'active',
      })
      apiMocks.getWhatsAppEndpoint.mockResolvedValueOnce(jsonResponse({ endpoint }))

      render(
        <QueryClientProvider client={queryClient}>
          <AgencySettingsDrawer isOpen={true} organizationId="org-1" agencyName="Agencia Activa" />
        </QueryClientProvider>,
      )

      await waitFor(() => {
        expect(screen.getByText('Vinculado')).toBeInTheDocument()
      })
      expect(screen.getByLabelText(/Teléfono de la agencia/i)).toHaveValue('+54 9 11 2222-3333')
    })

    it('displays "Número cargado" badge and pre-fills input when endpoint.status is inactive', async () => {
      setOnlineSession('org-1')
      const endpoint = makeEndpoint({
        number: '+54 9 11 7777-8888',
        status: 'inactive',
        linkingStatus: 'suspended',
      })
      apiMocks.getWhatsAppEndpoint.mockResolvedValueOnce(jsonResponse({ endpoint }))

      render(
        <QueryClientProvider client={queryClient}>
          <AgencySettingsDrawer isOpen={true} organizationId="org-1" agencyName="Agencia Cargada" />
        </QueryClientProvider>,
      )

      await waitFor(() => {
        expect(screen.getByText('Número cargado')).toBeInTheDocument()
      })
      expect(screen.getByLabelText(/Teléfono de la agencia/i)).toHaveValue('+54 9 11 7777-8888')
    })

    it('saves valid phone via $put, shows "Número de agencia guardado" toast, and enables "Solicitar QR"', async () => {
      const user = userEvent.setup()
      setOnlineSession('org-1')
      const savedEndpoint = makeEndpoint({
        number: '+54 9 11 1234-5678',
        status: 'inactive',
        linkingStatus: 'suspended',
      })
      apiMocks.getWhatsAppEndpoint
        .mockResolvedValueOnce(jsonResponse({ endpoint: null }))
        .mockResolvedValueOnce(jsonResponse({ endpoint: savedEndpoint }))
      apiMocks.putWhatsAppEndpoint.mockResolvedValueOnce(jsonResponse({ endpoint: savedEndpoint }))

      render(
        <QueryClientProvider client={queryClient}>
          <AgencySettingsDrawer isOpen={true} organizationId="org-1" agencyName="Seguros Online" />
        </QueryClientProvider>,
      )

      await waitFor(() => {
        expect(apiMocks.getWhatsAppEndpoint).toHaveBeenCalled()
        expect(queryClient.isFetching()).toBe(0)
      })
      expect(screen.getByText('Sin configurar')).toBeInTheDocument()

      const input = screen.getByLabelText(/Teléfono de la agencia/i)
      const saveButton = screen.getByRole('button', { name: 'Guardar número' })
      const qrButton = screen.getByRole('button', { name: 'Solicitar QR' })

      expect(qrButton).toBeDisabled()

      await user.type(input, '+54 9 11 1234-5678')
      await user.click(saveButton)

      await waitFor(() => {
        expect(apiMocks.putWhatsAppEndpoint).toHaveBeenCalledWith({
          json: { number: '+54 9 11 1234-5678' },
        })
      })

      await waitFor(() => {
        const shownInDom = screen.queryByText('Número de agencia guardado') !== null
        const calledToast = toastCalls.some((call) =>
          JSON.stringify(call.args).includes('Número de agencia guardado'),
        )
        expect(shownInDom || calledToast).toBe(true)
      })
      expect(qrButton).toBeEnabled()
    })

    it.each([
      ['400 Bad Request', 400, { message: 'Teléfono inválido' }],
      ['500 Internal Server Error', 500, { message: 'Error interno' }],
    ])(
      'shows error alert and does NOT show success toast when $put returns %s',
      async (_label, status, errorBody) => {
        const user = userEvent.setup()
        setOnlineSession('org-1')
        apiMocks.getWhatsAppEndpoint.mockResolvedValueOnce(jsonResponse({ endpoint: null }))
        apiMocks.putWhatsAppEndpoint.mockResolvedValueOnce(jsonResponse(errorBody, status))

        render(
          <QueryClientProvider client={queryClient}>
            <AgencySettingsDrawer isOpen={true} organizationId="org-1" agencyName="Seguros Error" />
          </QueryClientProvider>,
        )

        await waitFor(() => {
          expect(apiMocks.getWhatsAppEndpoint).toHaveBeenCalled()
          expect(queryClient.isFetching()).toBe(0)
        })
        expect(screen.getByText('Sin configurar')).toBeInTheDocument()

        const input = screen.getByLabelText(/Teléfono de la agencia/i)
        await user.type(input, '+54 9 11 1234-5678')
        await user.click(screen.getByRole('button', { name: 'Guardar número' }))

        await waitFor(() => {
          expect(screen.getByRole('alert')).toBeInTheDocument()
        })
        expect(screen.queryByText('Número de agencia guardado')).not.toBeInTheDocument()
        expect(
          toastCalls.some((call) =>
            JSON.stringify(call.args).includes('Número de agencia guardado'),
          ),
        ).toBe(false)
      },
    )
  })
})
