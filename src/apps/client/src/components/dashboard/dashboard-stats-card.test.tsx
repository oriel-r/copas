import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as ComponentModule from './dashboard-stats-card'
import type { DashboardStatsResponse } from '@copas/contracts'

const mockNavigate = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const DashboardStatsCard =
  (ComponentModule as any).DashboardStatsCard ?? (ComponentModule as any).default

const populatedStats: DashboardStatsResponse = {
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

let mockHookReturn: {
  data: DashboardStatsResponse | null | undefined
  isLoading: boolean
  error: any
} = {
  data: populatedStats,
  isLoading: false,
  error: null,
}

vi.mock('../../lib/api/use-portfolio-summary', () => ({
  usePortfolioSummary: () => mockHookReturn,
  default: () => mockHookReturn,
}))

vi.mock('../../lib/api/use-dashboard-stats', () => ({
  useDashboardStats: () => mockHookReturn,
  default: () => mockHookReturn,
}))

function renderCard(props: {
  stats?: DashboardStatsResponse
  data?: DashboardStatsResponse
  isLoading?: boolean
  error?: any
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  if (props.stats !== undefined || props.data !== undefined) {
    mockHookReturn = {
      data: props.stats ?? props.data,
      isLoading: props.isLoading ?? false,
      error: props.error ?? null,
    }
  } else if (props.isLoading !== undefined) {
    mockHookReturn = {
      ...mockHookReturn,
      isLoading: props.isLoading,
    }
  } else {
    mockHookReturn = {
      data: populatedStats,
      isLoading: false,
      error: null,
    }
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardStatsCard stats={props.stats ?? populatedStats} data={props.data ?? populatedStats} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DashboardStatsCard', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockHookReturn = {
      data: populatedStats,
      isLoading: false,
      error: null,
    }
  })

  describe('Given populated stats (3 Featured Metric Blocks)', () => {
    it('should render active policies count prominently', () => {
      renderCard({ stats: populatedStats })

      expect(screen.getByText(/pólizas activas|polizas activas/i)).toBeInTheDocument()
      expect(screen.getByText('142')).toBeInTheDocument()
    })

    it('should render total insureds count', () => {
      renderCard({ stats: populatedStats })

      expect(screen.getByText(/total asegurados|asegurados/i)).toBeInTheDocument()
      expect(screen.getByText('98')).toBeInTheDocument()
    })

    it('should render monthly paid installments in "X de Y" format along with collection rate', () => {
      renderCard({ stats: populatedStats })

      expect(screen.getByText(/cuotas cobradas|cobranza|cobrado/i)).toBeInTheDocument()
      expect(screen.getByText(/35\s*(de|\/)\s*50/i)).toBeInTheDocument()
      expect(screen.getByText(/70\s*%/i)).toBeInTheDocument()
    })
  })

  describe('Given companies distribution and Top 3 legend', () => {
    it('should display the top 3 insurance companies with name, percentage and count', () => {
      renderCard({ stats: populatedStats })

      expect(screen.getByText('Federación Patronal')).toBeInTheDocument()
      expect(screen.getByText(/50\s*%/i)).toBeInTheDocument()
      expect(screen.getByText(/71/)).toBeInTheDocument()

      expect(screen.getByText('San Cristóbal')).toBeInTheDocument()
      expect(screen.getByText(/30(\.28)?\s*%/i)).toBeInTheDocument()
      expect(screen.getByText(/43/)).toBeInTheDocument()

      expect(screen.getByText('Sancor Seguros')).toBeInTheDocument()
      expect(screen.getByText(/19(\.72)?\s*%/i)).toBeInTheDocument()
      expect(screen.getByText(/28/)).toBeInTheDocument()
    })

    it('should render a segmented company distribution bar', () => {
      const { container } = renderCard({ stats: populatedStats })

      // Check for segmented bar container or distribution elements
      const barContainer =
        container.querySelector('[data-testid="company-distribution-bar"]') ??
        container.querySelector('[role="progressbar"]') ??
        container.querySelector('.h-2, .h-3, .h-4, .rounded-full')

      expect(barContainer).toBeInTheDocument()
    })

    it('should display at most the top 3 companies in the legend even if distribution contains more', () => {
      const statsWithFiveCompanies: DashboardStatsResponse = {
        ...populatedStats,
        companiesDistribution: [
          ...populatedStats.companiesDistribution,
          { companyId: 'comp-4', companyName: 'La Segunda', activePoliciesCount: 15, percentage: 10 },
          { companyId: 'comp-5', companyName: 'Zurich', activePoliciesCount: 5, percentage: 3.5 },
        ],
      }

      renderCard({ stats: statsWithFiveCompanies })

      expect(screen.getByText('Federación Patronal')).toBeInTheDocument()
      expect(screen.getByText('San Cristóbal')).toBeInTheDocument()
      expect(screen.getByText('Sancor Seguros')).toBeInTheDocument()
      // 4th and 5th companies should not be in the top 3 legend
      expect(screen.queryByText('Zurich')).not.toBeInTheDocument()
    })
  })

  describe('Given Zero State (0 Active Policies)', () => {
    const zeroStats: DashboardStatsResponse = {
      activePoliciesCount: 0,
      totalInsuredsCount: 0,
      paidInstallmentsThisMonthCount: 0,
      totalInstallmentsThisMonthCount: 0,
      collectionRatePercentage: 0,
      companiesDistribution: [],
    }

    it('should render 0s for all metric blocks without divide-by-zero crashes', () => {
      renderCard({ stats: zeroStats })

      const zeroElements = screen.getAllByText('0')
      expect(zeroElements.length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText(/0\s*(de|\/)\s*0/i)).toBeInTheDocument()
    })

    it('should hide the companies distribution bar when activePoliciesCount is 0', () => {
      const { container } = renderCard({ stats: zeroStats })

      expect(screen.queryByTestId('company-distribution-bar')).not.toBeInTheDocument()
      expect(screen.queryByText('Federación Patronal')).not.toBeInTheDocument()
    })
  })

  describe('Given Loading State (isLoading = true)', () => {
    it('should render skeletons or loading indicators while fetching', () => {
      const { container } = renderCard({ isLoading: true })

      const skeletons =
        container.querySelectorAll('[data-testid="skeleton"], [data-slot="skeleton"], .animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Given Navigation to Cartera', () => {
    it('should navigate to "/cartera" when clicking on the active policies metric block', () => {
      renderCard({ stats: populatedStats })

      const policiesMetric =
        screen.getByRole('link', { name: /pólizas|polizas/i }) ??
        screen.getByText(/pólizas activas|polizas activas/i).closest('a, button, [role="button"]') ??
        screen.getByText(/pólizas activas|polizas activas/i)

      fireEvent.click(policiesMetric)

      const hasNavigated =
        mockNavigate.mock.calls.some(([path]: [string]) => path === '/cartera') ||
        (policiesMetric as HTMLAnchorElement).getAttribute?.('href') === '/cartera' ||
        (policiesMetric.closest('a') as HTMLAnchorElement | null)?.getAttribute?.('href') === '/cartera'

      expect(hasNavigated).toBe(true)
    })

    it('should navigate to "/cartera" when clicking on the insureds metric block', () => {
      renderCard({ stats: populatedStats })

      const insuredsMetric =
        screen.getByRole('link', { name: /asegurados/i }) ??
        screen.getByText(/total asegurados|asegurados/i).closest('a, button, [role="button"]') ??
        screen.getByText(/total asegurados|asegurados/i)

      fireEvent.click(insuredsMetric)

      const hasNavigated =
        mockNavigate.mock.calls.some(([path]: [string]) => path === '/cartera') ||
        (insuredsMetric as HTMLAnchorElement).getAttribute?.('href') === '/cartera' ||
        (insuredsMetric.closest('a') as HTMLAnchorElement | null)?.getAttribute?.('href') === '/cartera'

      expect(hasNavigated).toBe(true)
    })
  })
})
