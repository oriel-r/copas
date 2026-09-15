import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSessionStore, DEMO_SESSION } from '../session'
import {
  portfolioSummaryResponseSchema,
  type PortfolioSummaryResponse,
} from '@copas/contracts'
import * as hookModule from './use-portfolio-summary'

const usePortfolioSummary =
  (hookModule as any).usePortfolioSummary ?? (hookModule as any).default

const mockPortfolioSummary: PortfolioSummaryResponse = {
  activePoliciesCount: 142,
  totalInsuredsCount: 98,
  paidInstallmentsThisMonthCount: 35,
  totalInstallmentsThisMonthCount: 50,
  collectionRatePercentage: 70,
  companiesDistribution: [
    {
      companyId: 'comp-1',
      companyName: 'Federación Patronal',
      activePoliciesCount: 71,
      percentage: 50,
    },
    {
      companyId: 'comp-2',
      companyName: 'San Cristóbal',
      activePoliciesCount: 43,
      percentage: 30.28,
    },
    {
      companyId: 'comp-3',
      companyName: 'Sancor Seguros',
      activePoliciesCount: 28,
      percentage: 19.72,
    },
  ],
}

const mockZeroStateSummary: PortfolioSummaryResponse = {
  activePoliciesCount: 0,
  totalInsuredsCount: 0,
  paidInstallmentsThisMonthCount: 0,
  totalInstallmentsThisMonthCount: 0,
  collectionRatePercentage: 0,
  companiesDistribution: [],
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  )
}

describe('usePortfolioSummary hook', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    useSessionStore.setState({ status: 'checking', demoSession: null, realSession: null })
  })

  describe('Given Offline / Demo Mode', () => {
    beforeEach(() => {
      useSessionStore.setState({
        status: 'offline',
        demoSession: DEMO_SESSION,
        realSession: null,
      })
    })

    it('should return valid mock data matching portfolioSummaryResponseSchema without network calls', async () => {
      const { result } = renderHook(() => usePortfolioSummary(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toBeDefined()
      const validation = portfolioSummaryResponseSchema.safeParse(result.current.data)
      expect(validation.success).toBe(true)

      const portfolioCalls = fetchMock.mock.calls.filter(([url]) =>
        typeof url === 'string' && url.includes('/portfolio/summary'),
      )
      expect(portfolioCalls.length).toBe(0)
    })

    it('should provide non-empty companiesDistribution and positive metrics in demo mode', async () => {
      const { result } = renderHook(() => usePortfolioSummary(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      const data = result.current.data as PortfolioSummaryResponse
      expect(data.activePoliciesCount).toBeGreaterThan(0)
      expect(data.totalInsuredsCount).toBeGreaterThan(0)
      expect(data.companiesDistribution.length).toBeGreaterThan(0)
    })
  })

  describe('Given Connected / Online Mode', () => {
    beforeEach(() => {
      useSessionStore.setState({
        status: 'online',
        demoSession: null,
        realSession: {
          data: {
            user: { id: 'usr-1', email: 'test@example.com' },
            session: { id: 'ses-1', activeOrganizationId: 'org-1' },
          },
          isPending: false,
          error: null,
        } as any,
      })
    })

    it('should query /portfolio/summary and return contract-validated response on 200 OK', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockPortfolioSummary), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const { result } = renderHook(() => usePortfolioSummary(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockPortfolioSummary)
      const validation = portfolioSummaryResponseSchema.safeParse(result.current.data)
      expect(validation.success).toBe(true)

      const calledPortfolioSummary = fetchMock.mock.calls.some(([url]) =>
        typeof url === 'string' && url.includes('/portfolio/summary'),
      )
      expect(calledPortfolioSummary).toBe(true)
    })

    it('should correctly handle zero state from connected backend', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockZeroStateSummary), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const { result } = renderHook(() => usePortfolioSummary(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockZeroStateSummary)
      expect(result.current.data.activePoliciesCount).toBe(0)
      expect(result.current.data.companiesDistribution).toEqual([])
    })
  })

  describe('Given Error Handling in Connected Mode', () => {
    beforeEach(() => {
      useSessionStore.setState({
        status: 'online',
        demoSession: null,
        realSession: {
          data: {
            user: { id: 'usr-1' },
            session: { id: 'ses-1', activeOrganizationId: 'org-1' },
          },
          isPending: false,
          error: null,
        } as any,
      })
    })

    it('should expose error state when backend responds with 500 Internal Server Error', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Internal Server Error' }), {
          status: 500,
          statusText: 'Internal Server Error',
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const { result } = renderHook(() => usePortfolioSummary(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError || result.current.error !== null).toBe(true)
      })

      expect(result.current.data).toBeUndefined()
    })

    it('should expose error state when network request fails with TypeError', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const { result } = renderHook(() => usePortfolioSummary(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError || result.current.error !== null).toBe(true)
      })

      expect(result.current.data).toBeUndefined()
    })
  })
})
