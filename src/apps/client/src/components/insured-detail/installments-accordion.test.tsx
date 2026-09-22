import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as AccordionModule from './installments-accordion'
import type { InstallmentsAccordionProps } from './installments-accordion'
import type { InstallmentDetailedItem, InstallmentsDetailedResponse } from '@copas/contracts'

const AccordionComponent: React.ComponentType<InstallmentsAccordionProps> =
  (AccordionModule as any).InstallmentsAccordion ?? (AccordionModule as any).default

const mockApi = vi.hoisted(() => ({
  usePolicyInstallments: vi.fn(),
  useToggleInstallmentStatus: vi.fn(),
  mutateToggle: vi.fn(),
}))

vi.mock('@/lib/api/use-insured-detail', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>().catch(() => ({}))
  return {
    ...actual,
    usePolicyInstallments: (...args: any[]) => mockApi.usePolicyInstallments(...args),
    useToggleInstallmentStatus: (...args: any[]) => mockApi.useToggleInstallmentStatus(...args),
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

describe('InstallmentsAccordion Component', () => {
  const policyId = '019213ab-pol1-7000-8000-000000000001'

  const mockInstallments: InstallmentDetailedItem[] = [
    {
      installmentId: '019213ab-inst1-7000-8000-000000000001',
      policyId,
      policyNumber: 'POL-12345',
      installmentNumber: 1,
      insuredName: 'JUAN CARLOS PEREZ',
      companyName: 'Sancor Seguros',
      assetDescription: 'Toyota Corolla 2022',
      totalAmount: '15000.00',
      currency: 'ARS',
      dueDate: '2026-02-15',
      status: 'pending',
    },
    {
      installmentId: '019213ab-inst2-7000-8000-000000000002',
      policyId,
      policyNumber: 'POL-12345',
      installmentNumber: 2,
      insuredName: 'JUAN CARLOS PEREZ',
      companyName: 'Sancor Seguros',
      assetDescription: 'Toyota Corolla 2022',
      totalAmount: '15000.00',
      currency: 'ARS',
      dueDate: '2026-03-15',
      status: 'paid',
    },
  ]

  const mockInstallmentsResponse: InstallmentsDetailedResponse = {
    appliedFilters: {
      dueDate: null,
      status: 'all',
      companyId: null,
      insuredId: null,
    },
    total: 2,
    items: mockInstallments,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.mutateToggle.mockReset()

    mockApi.usePolicyInstallments.mockReturnValue({
      data: mockInstallmentsResponse,
      isLoading: false,
      isPending: false,
      error: null,
    })

    mockApi.useToggleInstallmentStatus.mockReturnValue({
      mutate: mockApi.mutateToggle,
      isPending: false,
    })
  })

  describe('Collapsed vs Expanded Initial State', () => {
    it('should start collapsed by default when defaultOpen is not provided', () => {
      renderWithClient(<AccordionComponent policyId={policyId} />)

      const trigger =
        screen.queryByRole('button', { name: /cuotas|cronograma/i }) ??
        screen.getByRole('button')

      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByText('2026-02-15')).not.toBeInTheDocument()
    })

    it('should start expanded when defaultOpen is true and render installment items', () => {
      renderWithClient(<AccordionComponent policyId={policyId} defaultOpen={true} />)

      expect(screen.getAllByText(/15\.?000/).length).toBeGreaterThan(0)
      expect(screen.getByText(/2026-02-15|15\/02\/2026/)).toBeInTheDocument()
    })
  })

  describe('Accordion Interaction and Installments Table Display', () => {
    it('should expand and display installments table with number, dueDate, amount, and status when clicked', async () => {
      const user = userEvent.setup()
      renderWithClient(<AccordionComponent policyId={policyId} />)

      const trigger =
        screen.queryByRole('button', { name: /cuotas|cronograma/i }) ??
        screen.getByRole('button')

      await user.click(trigger)

      // Verify installment 1 (pending)
      expect(screen.getByText(/2026-02-15|15\/02\/2026/)).toBeInTheDocument()
      expect(screen.getAllByText(/pendiente|pending/i).length).toBeGreaterThan(0)

      // Verify installment 2 (paid)
      expect(screen.getByText(/2026-03-15|15\/03\/2026/)).toBeInTheDocument()
      expect(screen.getAllByText(/pagada|paid/i).length).toBeGreaterThan(0)
    })

    it('should collapse the table when clicking the trigger again', async () => {
      const user = userEvent.setup()
      renderWithClient(<AccordionComponent policyId={policyId} defaultOpen={true} />)

      const trigger =
        screen.queryByRole('button', { name: /cuotas|cronograma/i }) ??
        screen.getByRole('button')

      await user.click(trigger)

      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByText('2026-02-15')).not.toBeInTheDocument()
    })
  })

  describe('Toggle Installment Payment Status (pending <-> paid)', () => {
    it('should call mutation to toggle status when action button is clicked on a pending installment', async () => {
      const user = userEvent.setup()
      renderWithClient(<AccordionComponent policyId={policyId} defaultOpen={true} />)

      // Look for the toggle action button in the first installment row (pending -> paid)
      const actionButtons = screen.getAllByRole('button')
      const itemActionButtons = actionButtons.filter(
        (btn) => !btn.getAttribute('aria-expanded'),
      )

      expect(itemActionButtons.length).toBeGreaterThan(0)
      await user.click(itemActionButtons[0])

      expect(mockApi.mutateToggle).toHaveBeenCalledWith(
        expect.objectContaining({
          installmentId: '019213ab-inst1-7000-8000-000000000001',
          policyId,
          currentStatus: 'pending',
        }),
      )
    })
  })

  describe('Empty and Loading States', () => {
    it('should render empty state message when policy has no installments', async () => {
      mockApi.usePolicyInstallments.mockReturnValue({
        data: {
          ...mockInstallmentsResponse,
          total: 0,
          items: [],
        },
        isLoading: false,
        isPending: false,
        error: null,
      })

      renderWithClient(<AccordionComponent policyId={policyId} defaultOpen={true} />)

      expect(
        screen.getByText(/no se registran cuotas|sin cuotas|no hay cuotas|no se encontraron cuotas/i),
      ).toBeInTheDocument()
    })

    it('should render loading skeleton or indicator while fetching installments', () => {
      mockApi.usePolicyInstallments.mockReturnValue({
        data: undefined,
        isLoading: true,
        isPending: true,
        error: null,
      })

      const { container } = renderWithClient(<AccordionComponent policyId={policyId} defaultOpen={true} />)

      const loader =
        screen.queryByText(/cargando/i) ??
        screen.queryByLabelText(/cargando|loading/i) ??
        screen.queryByRole('status') ??
        container.querySelector('.animate-spin, .animate-pulse')

      expect(loader).toBeTruthy()
    })
  })
})
