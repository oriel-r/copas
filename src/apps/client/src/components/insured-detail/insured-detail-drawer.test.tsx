import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import * as DrawerModule from './insured-detail-drawer'
import type { InsuredDetailDrawerProps } from './insured-detail-drawer'
import type { InsuredDetailResponse } from '@copas/contracts'

const InsuredDetailDrawer: React.ComponentType<InsuredDetailDrawerProps> =
  (DrawerModule as any).InsuredDetailDrawer ?? (DrawerModule as any).default

const mockApi = vi.hoisted(() => ({
  useInsuredDetail: vi.fn(),
  useUpdateInsured: vi.fn(),
  usePoliciesByInsured: vi.fn(),
  useUpdatePolicy: vi.fn(),
  usePolicyInstallments: vi.fn(),
  useToggleInstallmentStatus: vi.fn(),
}))

vi.mock('@/lib/api/use-insured-detail', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>().catch(() => ({}))
  return {
    ...actual,
    useInsuredDetail: (...args: any[]) => mockApi.useInsuredDetail(...args),
    useUpdateInsured: (...args: any[]) => mockApi.useUpdateInsured(...args),
    usePoliciesByInsured: (...args: any[]) => mockApi.usePoliciesByInsured(...args),
    useUpdatePolicy: (...args: any[]) => mockApi.useUpdatePolicy(...args),
    usePolicyInstallments: (...args: any[]) => mockApi.usePolicyInstallments(...args),
    useToggleInstallmentStatus: (...args: any[]) => mockApi.useToggleInstallmentStatus(...args),
  }
})

function renderWithClient(
  ui: React.ReactElement,
  initialEntries: string[] = ['/cartera'],
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('InsuredDetailDrawer Component', () => {
  const insuredId = '019213ab-1111-7000-8000-000000000001'

  const mockInsuredData: InsuredDetailResponse = {
    id: insuredId,
    organizationId: '019213ab-org1-7000-8000-000000000001',
    uploadedBy: '019213ab-user-7000-8000-000000000001',
    fullName: 'JUAN CARLOS PEREZ',
    cuit: '20123456789',
    phone: '+541112345678',
    email: 'juan.perez@example.com',
    birthDate: '1985-05-15',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    companies: ['Sancor Seguros'],
    activePoliciesCount: 1,
    totalPoliciesCount: 2,
    latestPolicy: {
      id: '019213ab-pol1-7000-8000-000000000001',
      policyNumber: 'POL-12345',
      companyId: '019213ab-comp-7000-8000-000000000001',
      companyName: 'Sancor Seguros',
      branchId: '019213ab-bran-7000-8000-000000000001',
      branchName: 'Automotores',
      assetDescription: 'Toyota Corolla 2022',
      startDate: '2026-01-01',
      endDate: '2027-01-01',
      status: 'active',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.style.overflow = ''

    mockApi.useInsuredDetail.mockImplementation((id: string | null) => {
      if (!id) {
        return {
          data: undefined,
          isLoading: false,
          isPending: false,
          error: null,
        }
      }
      return {
        data: mockInsuredData,
        isLoading: false,
        isPending: false,
        error: null,
      }
    })

    mockApi.useUpdateInsured.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    })

    mockApi.usePoliciesByInsured.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      isPending: false,
      error: null,
    })

    mockApi.useUpdatePolicy.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    })

    mockApi.usePolicyInstallments.mockReturnValue({
      data: {
        items: [],
        total: 0,
        appliedFilters: {
          dueDate: null,
          status: 'all',
          companyId: null,
          insuredId: null,
        },
      },
      isLoading: false,
      isPending: false,
      error: null,
    })

    mockApi.useToggleInstallmentStatus.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    })
  })

  afterEach(() => {
    document.body.style.overflow = ''
  })

  describe('Conditional Rendering based on isOpen and insuredId', () => {
    it('should not render anything when isOpen is false', () => {
      const { container } = renderWithClient(
        <InsuredDetailDrawer isOpen={false} insuredId={insuredId} onClose={vi.fn()} />,
      )

      expect(container.firstChild).toBeNull()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should not render anything when insuredId is null', () => {
      const { container } = renderWithClient(
        <InsuredDetailDrawer isOpen={true} insuredId={null} onClose={vi.fn()} />,
      )

      expect(container.firstChild).toBeNull()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should not render anything when insuredId is undefined and not in URL', () => {
      const { container } = renderWithClient(
        <InsuredDetailDrawer isOpen={true} insuredId={undefined} onClose={vi.fn()} />,
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Modal Accessibility and Structure', () => {
    it('should render an accessible modal dialog with role="dialog", aria-modal="true", and aria-labelledby', () => {
      renderWithClient(
        <InsuredDetailDrawer isOpen={true} insuredId={insuredId} onClose={vi.fn()} />,
        [`/cartera?insuredId=${insuredId}`],
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'insured-drawer-title')

      const title = document.getElementById('insured-drawer-title')
      expect(title).toBeInTheDocument()
    })
  })

  describe('Close Triggers: Keyboard Escape and Backdrop Click', () => {
    it('should trigger onClose when Escape key is pressed', () => {
      const onCloseMock = vi.fn()
      renderWithClient(
        <InsuredDetailDrawer isOpen={true} insuredId={insuredId} onClose={onCloseMock} />,
        [`/cartera?insuredId=${insuredId}`],
      )

      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })

      expect(onCloseMock).toHaveBeenCalledOnce()
    })

    it('should trigger onClose when clicking the backdrop overlay', async () => {
      const user = userEvent.setup()
      const onCloseMock = vi.fn()
      renderWithClient(
        <InsuredDetailDrawer isOpen={true} insuredId={insuredId} onClose={onCloseMock} />,
        [`/cartera?insuredId=${insuredId}`],
      )

      const backdrop =
        screen.queryByTestId('drawer-backdrop') ??
        screen.getByRole('dialog').parentElement

      if (backdrop) {
        await user.click(backdrop)
        expect(onCloseMock).toHaveBeenCalled()
      }
    })
  })

  describe('Body Scroll Locking', () => {
    it('should lock body scroll (overflow: hidden) when open and restore it on unmount', () => {
      const { unmount } = renderWithClient(
        <InsuredDetailDrawer isOpen={true} insuredId={insuredId} onClose={vi.fn()} />,
        [`/cartera?insuredId=${insuredId}`],
      )

      expect(document.body.style.overflow).toBe('hidden')

      unmount()

      expect(document.body.style.overflow).not.toBe('hidden')
    })
  })

  describe('Loading and Error States', () => {
    it('should render loading skeleton while insured data is being fetched', () => {
      mockApi.useInsuredDetail.mockReturnValue({
        data: undefined,
        isLoading: true,
        isPending: true,
        error: null,
      })

      const { container } = renderWithClient(
        <InsuredDetailDrawer isOpen={true} insuredId={insuredId} onClose={vi.fn()} />,
        [`/cartera?insuredId=${insuredId}`],
      )

      const skeleton =
        screen.queryByLabelText(/cargando|loading/i) ??
        container.querySelector('.animate-pulse')

      expect(skeleton).toBeTruthy()
    })

    it('should render error message / 404 state with close button when query fails', async () => {
      const user = userEvent.setup()
      const onCloseMock = vi.fn()

      mockApi.useInsuredDetail.mockReturnValue({
        data: undefined,
        isLoading: false,
        isPending: false,
        error: new Error('Asegurado no encontrado'),
      })

      renderWithClient(
        <InsuredDetailDrawer isOpen={true} insuredId={insuredId} onClose={onCloseMock} />,
        [`/cartera?insuredId=${insuredId}`],
      )

      expect(
        screen.getByText(/asegurado no encontrado|error al cargar|no encontrado/i),
      ).toBeInTheDocument()

      const closeBtn =
        screen.queryByRole('button', { name: /cerrar|close/i }) ??
        screen.getByRole('button')

      await user.click(closeBtn)
      expect(onCloseMock).toHaveBeenCalled()
    })
  })

  describe('Successful Data Rendering in Drawer Content', () => {
    it('should render full name, profile details, and latest policy card when loaded', () => {
      renderWithClient(
        <InsuredDetailDrawer isOpen={true} insuredId={insuredId} onClose={vi.fn()} />,
        [`/cartera?insuredId=${insuredId}`],
      )

      expect(screen.getByText('JUAN CARLOS PEREZ')).toBeInTheDocument()
      expect(screen.getByText(/20-?12345678-?9/)).toBeInTheDocument()
      expect(screen.getByText(/POL-12345/)).toBeInTheDocument()
      expect(screen.getAllByText('Sancor Seguros').length).toBeGreaterThan(0)
    })
  })
})
