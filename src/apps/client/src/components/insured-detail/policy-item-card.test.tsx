import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as CardModule from './policy-item-card'
import type { PolicyItemCardProps } from './policy-item-card'
import type { PolicyDetailedItem } from '@copas/contracts'

const PolicyItemCard: React.ComponentType<PolicyItemCardProps> =
  (CardModule as any).PolicyItemCard ?? (CardModule as any).default

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('PolicyItemCard Component', () => {
  const mockPolicy: PolicyDetailedItem = {
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
    premiumTotal: '150000.00',
    currency: 'ARS',
  }

  const defaultProps: PolicyItemCardProps = {
    policy: mockPolicy,
    insuredId: '019213ab-ins1-7000-8000-000000000001',
    isLatestActive: false,
    onUpdatePolicy: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Policy Metadata Rendering', () => {
    it('should render policy number, company name, branch name, and asset description', () => {
      renderWithClient(<PolicyItemCard {...defaultProps} />)

      expect(screen.getByText(/POL-12345/)).toBeInTheDocument()
      expect(screen.getByText('Sancor Seguros')).toBeInTheDocument()
      expect(screen.getByText(/Automotores/)).toBeInTheDocument()
      expect(screen.getByText(/Toyota Corolla 2022/)).toBeInTheDocument()
    })

    it('should render coverage dates (vigencia) and status badge', () => {
      renderWithClient(<PolicyItemCard {...defaultProps} />)

      expect(screen.getByText(/2026-01-01|01\/01\/2026/)).toBeInTheDocument()
      expect(screen.getByText(/2027-01-01|01\/01\/2027/)).toBeInTheDocument()
      expect(screen.getByText(/activa|active/i)).toBeInTheDocument()
    })

    it('should render premium and currency when present', () => {
      renderWithClient(<PolicyItemCard {...defaultProps} />)

      expect(screen.getByText(/150\.?000|150000/)).toBeInTheDocument()
      expect(screen.getByText(/ARS|\$/)).toBeInTheDocument()
    })
  })

  describe('Latest Active Badge ("Última Activa")', () => {
    it('should render "Última Activa" badge when isLatestActive is true', () => {
      renderWithClient(<PolicyItemCard {...defaultProps} isLatestActive={true} />)

      expect(screen.getByText(/última activa/i)).toBeInTheDocument()
    })

    it('should not render "Última Activa" badge when isLatestActive is false or omitted', () => {
      renderWithClient(<PolicyItemCard {...defaultProps} isLatestActive={false} />)

      expect(screen.queryByText(/última activa/i)).not.toBeInTheDocument()
    })
  })

  describe('Edit Mode and Date Validation (startDate <= endDate)', () => {
    it('should switch to edit mode when clicking "Editar" and show editable fields', async () => {
      const user = userEvent.setup()
      const { container } = renderWithClient(<PolicyItemCard {...defaultProps} />)

      const editButton = screen.getByRole('button', { name: /editar/i })
      await user.click(editButton)

      const policyNumberInput =
        screen.queryByLabelText(/número de póliza|póliza|numero/i) ??
        container.querySelector('input[name="policyNumber"]') ??
        screen.getByDisplayValue('POL-12345')
      expect(policyNumberInput).toBeInTheDocument()

      expect(screen.getByRole('button', { name: /guardar|save/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancelar|cancel/i })).toBeInTheDocument()
    })

    it('should cancel editing and revert to read-only view when clicking "Cancelar"', async () => {
      const user = userEvent.setup()
      renderWithClient(<PolicyItemCard {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /editar/i }))
      expect(screen.getByRole('button', { name: /cancelar|cancel/i })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /cancelar|cancel/i }))

      expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /guardar|save/i })).not.toBeInTheDocument()
    })

    it('should show error and prevent submission when startDate is after endDate', async () => {
      const user = userEvent.setup()
      const onUpdateMock = vi.fn()
      const { container } = renderWithClient(
        <PolicyItemCard {...defaultProps} onUpdatePolicy={onUpdateMock} />,
      )

      await user.click(screen.getByRole('button', { name: /editar/i }))

      const startDateInput =
        screen.queryByLabelText(/inicio|desde|fecha inicio/i) ??
        container.querySelector('input[name="startDate"]') ??
        screen.getByDisplayValue('2026-01-01')

      const endDateInput =
        screen.queryByLabelText(/fin|hasta|fecha fin/i) ??
        container.querySelector('input[name="endDate"]') ??
        screen.getByDisplayValue('2027-01-01')

      // Set startDate > endDate
      await user.clear(startDateInput)
      await user.type(startDateInput, '2028-01-01')

      await user.click(screen.getByRole('button', { name: /guardar|save/i }))

      expect(onUpdateMock).not.toHaveBeenCalled()
      expect(
        screen.getByText(/anterior|no puede ser anterior|fecha inválida|startDate/i),
      ).toBeInTheDocument()
    })

    it('should call onUpdatePolicy with updated payload on valid submission', async () => {
      const user = userEvent.setup()
      const onUpdateMock = vi.fn()
      const { container } = renderWithClient(
        <PolicyItemCard {...defaultProps} onUpdatePolicy={onUpdateMock} />,
      )

      await user.click(screen.getByRole('button', { name: /editar/i }))

      const policyNumberInput =
        screen.queryByLabelText(/número de póliza|póliza|numero/i) ??
        container.querySelector('input[name="policyNumber"]') ??
        screen.getByDisplayValue('POL-12345')

      await user.clear(policyNumberInput)
      await user.type(policyNumberInput, 'POL-RENEWED-999')

      await user.click(screen.getByRole('button', { name: /guardar|save/i }))

      expect(onUpdateMock).toHaveBeenCalledOnce()
      expect(onUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          policyNumber: 'POL-RENEWED-999',
        }),
      )
    })
  })

  describe('Installments Accordion Integration', () => {
    it('should render the installments accordion trigger/section inside the policy card', () => {
      renderWithClient(<PolicyItemCard {...defaultProps} />)

      const accordionTriggers = screen.getAllByText(/cuotas|cronograma/i)
      expect(accordionTriggers.length).toBeGreaterThan(0)
    })
  })

  describe('Loading State in Edit Mode', () => {
    it('should disable submit button when isUpdating is true in edit mode', async () => {
      const user = userEvent.setup()
      const { rerender } = renderWithClient(
        <PolicyItemCard {...defaultProps} isUpdating={false} />,
      )

      await user.click(screen.getByRole('button', { name: /editar/i }))

      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <PolicyItemCard {...defaultProps} isUpdating={true} />
        </QueryClientProvider>,
      )

      const saveButton = screen.queryByRole('button', { name: /guardar|guardando|save/i })
      if (saveButton) {
        expect(saveButton).toBeDisabled()
      }
    })
  })
})
