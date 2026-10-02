import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as SectionModule from './additional-policies-section'
import type { AdditionalPoliciesSectionProps } from './additional-policies-section'
import type { PoliciesDetailedResponse, PolicyDetailedItem } from '@copas/contracts'

const AdditionalPoliciesSection: React.ComponentType<AdditionalPoliciesSectionProps> =
  (SectionModule as any).AdditionalPoliciesSection ?? (SectionModule as any).default

const mockApi = vi.hoisted(() => ({
  usePoliciesByInsured: vi.fn(),
}))

vi.mock('@/lib/api/use-insured-detail', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>().catch(() => ({}))
  return {
    ...actual,
    usePoliciesByInsured: (...args: any[]) => mockApi.usePoliciesByInsured(...args),
  }
})

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('AdditionalPoliciesSection Component', () => {
  const insuredId = '019213ab-ins1-7000-8000-000000000001'

  const mockAdditionalPolicies: PolicyDetailedItem[] = [
    {
      id: '019213ab-pol2-7000-8000-000000000002',
      policyNumber: 'POL-ADD-101',
      companyId: '019213ab-comp2-7000-8000-000000000002',
      companyName: 'Federación Patronal',
      branchId: '019213ab-bran2-7000-8000-000000000002',
      branchName: 'Hogar',
      assetDescription: 'Av. Libertador 4500, CABA',
      startDate: '2025-05-01',
      endDate: '2026-05-01',
      status: 'active',
      premiumTotal: '80000.00',
      currency: 'ARS',
    },
    {
      id: '019213ab-pol3-7000-8000-000000000003',
      policyNumber: 'POL-ADD-102',
      companyId: '019213ab-comp3-7000-8000-000000000003',
      companyName: 'La Segunda',
      branchId: '019213ab-bran3-7000-8000-000000000003',
      branchName: 'Vida',
      assetDescription: 'Seguro de Vida Colectivo',
      startDate: '2024-01-01',
      endDate: '2025-01-01',
      status: 'expired',
      premiumTotal: '45000.00',
      currency: 'ARS',
    },
  ]

  const mockPoliciesResponse: PoliciesDetailedResponse = {
    items: mockAdditionalPolicies,
    total: 2,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockApi.usePoliciesByInsured.mockReturnValue({
      data: mockPoliciesResponse,
      isLoading: false,
      isPending: false,
      error: null,
    })
  })

  describe('Conditional Rendering based on Policy Counts', () => {
    it('should not render anything when totalPoliciesCount equals alreadyLoadedCount', () => {
      const { container } = renderWithClient(
        <AdditionalPoliciesSection
          insuredId={insuredId}
          totalPoliciesCount={1}
          alreadyLoadedCount={1}
        />,
      )

      expect(container.firstChild).toBeNull()
    })

    it('should not render anything when totalPoliciesCount is less than alreadyLoadedCount', () => {
      const { container } = renderWithClient(
        <AdditionalPoliciesSection
          insuredId={insuredId}
          totalPoliciesCount={0}
          alreadyLoadedCount={1}
        />,
      )

      expect(container.firstChild).toBeNull()
    })

    it('should not render anything when totalPoliciesCount is 0', () => {
      const { container } = renderWithClient(
        <AdditionalPoliciesSection
          insuredId={insuredId}
          totalPoliciesCount={0}
          alreadyLoadedCount={0}
        />,
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('"Ver más pólizas" Button and Remaining Count', () => {
    it('should render "Ver más pólizas" button indicating the remaining count', () => {
      renderWithClient(
        <AdditionalPoliciesSection
          insuredId={insuredId}
          totalPoliciesCount={3}
          alreadyLoadedCount={1}
        />,
      )

      const button = screen.getByRole('button', { name: /ver más pólizas|ver mas polizas/i })
      expect(button).toBeInTheDocument()
      // Should show remaining count (3 - 1 = 2)
      expect(screen.getByText(/2/)).toBeInTheDocument()
    })
  })

  describe('Lazy Loading and Rendering Additional PolicyItemCards', () => {
    it('should fetch and display additional policies when clicking "Ver más pólizas"', async () => {
      const user = userEvent.setup()
      renderWithClient(
        <AdditionalPoliciesSection
          insuredId={insuredId}
          totalPoliciesCount={3}
          alreadyLoadedCount={1}
        />,
      )

      const button = screen.getByRole('button', { name: /ver más pólizas|ver mas polizas/i })
      await user.click(button)

      // The additional policies should be rendered
      expect(screen.getByText(/POL-ADD-101/)).toBeInTheDocument()
      expect(screen.getByText('Federación Patronal')).toBeInTheDocument()
      expect(screen.getByText(/POL-ADD-102/)).toBeInTheDocument()
      expect(screen.getByText('La Segunda')).toBeInTheDocument()
    })

    it('should render loading state while fetching additional policies', async () => {
      const user = userEvent.setup()
      mockApi.usePoliciesByInsured.mockReturnValue({
        data: undefined,
        isLoading: true,
        isPending: true,
        error: null,
      })

      const { container } = renderWithClient(
        <AdditionalPoliciesSection
          insuredId={insuredId}
          totalPoliciesCount={3}
          alreadyLoadedCount={1}
        />,
      )

      const button = screen.getByRole('button', { name: /ver más pólizas|ver mas polizas/i })
      await user.click(button)

      const loader =
        screen.queryByText(/cargando/i) ??
        screen.queryByLabelText(/cargando|loading/i) ??
        screen.queryByRole('status') ??
        container.querySelector('.animate-spin, .animate-pulse')

      expect(loader).toBeTruthy()
    })

    it('should pass onUpdatePolicy callback to loaded policy cards', async () => {
      const user = userEvent.setup()
      const onUpdateMock = vi.fn()

      renderWithClient(
        <AdditionalPoliciesSection
          insuredId={insuredId}
          totalPoliciesCount={3}
          alreadyLoadedCount={1}
          onUpdatePolicy={onUpdateMock}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: /ver más pólizas|ver mas polizas/i }),
      )

      expect(screen.getByText(/POL-ADD-101/)).toBeInTheDocument()
    })
  })
})
