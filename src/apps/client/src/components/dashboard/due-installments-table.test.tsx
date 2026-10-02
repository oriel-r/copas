import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import * as ComponentModule from './due-installments-table'
import type { InstallmentDetailedItem, ReminderDispatchSummary } from '@copas/contracts'

const componentExports = ComponentModule as {
  DueInstallmentsTable?: ComponentType<Record<string, unknown>>
  default?: ComponentType<Record<string, unknown>>
}

const DueInstallmentsTable =
  componentExports.DueInstallmentsTable ?? componentExports.default ?? (() => null)

describe('DueInstallmentsTable', () => {
  const mockItems: InstallmentDetailedItem[] = [
    {
      installmentId: '018f9e2b-1111-7000-8000-000000000001',
      policyId: '018f9e2b-2222-7000-8000-000000000002',
      policyNumber: 'POL-998877',
      installmentNumber: 1,
      insuredName: 'JUAN CARLOS PEREZ',
      companyName: 'FEDERACION PATRONAL',
      assetDescription: 'TOYOTA COROLLA (AB123CD)',
      totalAmount: 125000,
      currency: 'ARS',
      dueDate: '2026-09-15',
      status: 'pending',
    },
    {
      installmentId: '018f9e2b-3333-7000-8000-000000000003',
      policyId: '018f9e2b-4444-7000-8000-000000000004',
      policyNumber: 'POL-554433',
      installmentNumber: 3,
      insuredName: 'MARIA ELENA LOPEZ',
      companyName: 'SAN CRISTOBAL',
      assetDescription: 'Av. Libertador 500',
      totalAmount: 85000,
      currency: 'ARS',
      dueDate: '2026-09-15',
      status: 'pending',
    },
  ]

  let mockOnMarkAsPaid: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnMarkAsPaid = vi.fn()
  })

  describe('Given a populated list of due installments', () => {
    it('should render insured full name for each installment', () => {
      render(<DueInstallmentsTable items={mockItems} onMarkAsPaid={mockOnMarkAsPaid} />)

      expect(screen.getByText('JUAN CARLOS PEREZ')).toBeInTheDocument()
      expect(screen.getByText('MARIA ELENA LOPEZ')).toBeInTheDocument()
    })

    it('should render insurance company name for each installment', () => {
      render(<DueInstallmentsTable items={mockItems} onMarkAsPaid={mockOnMarkAsPaid} />)

      expect(screen.getByText('FEDERACION PATRONAL')).toBeInTheDocument()
      expect(screen.getByText('SAN CRISTOBAL')).toBeInTheDocument()
    })

    it('should render formatted asset description for each installment', () => {
      render(<DueInstallmentsTable items={mockItems} onMarkAsPaid={mockOnMarkAsPaid} />)

      expect(screen.getByText('TOYOTA COROLLA (AB123CD)')).toBeInTheDocument()
      expect(screen.getByText('Av. Libertador 500')).toBeInTheDocument()
    })

    it('should render formatted amount for each installment', () => {
      render(<DueInstallmentsTable items={mockItems} onMarkAsPaid={mockOnMarkAsPaid} />)

      expect(screen.getByText(/125\.000/)).toBeInTheDocument()
      expect(screen.getByText(/85\.000/)).toBeInTheDocument()
    })

    it('should render action buttons labeled "Marcar pagado" for pending installments', () => {
      render(<DueInstallmentsTable items={mockItems} onMarkAsPaid={mockOnMarkAsPaid} />)

      const buttons = screen.getAllByRole('button', { name: /marcar.*pagad/i })
      expect(buttons).toHaveLength(2)
    })

    it('should call onMarkAsPaid callback with installment ID when clicking "Marcar pagado"', () => {
      render(<DueInstallmentsTable items={mockItems} onMarkAsPaid={mockOnMarkAsPaid} />)

      const buttons = screen.getAllByRole('button', { name: /marcar.*pagad/i })
      fireEvent.click(buttons[0])

      expect(mockOnMarkAsPaid).toHaveBeenCalledTimes(1)
      expect(mockOnMarkAsPaid).toHaveBeenCalledWith(
        expect.toBeOneOf([
          '018f9e2b-1111-7000-8000-000000000001',
          expect.objectContaining({ installmentId: '018f9e2b-1111-7000-8000-000000000001' }),
        ]),
      )
    })
  })

  describe('Given an empty list of installments', () => {
    it('should render an empty state message when items is empty', () => {
      render(<DueInstallmentsTable items={[]} onMarkAsPaid={mockOnMarkAsPaid} />)

      expect(
        screen.getByText(/no hay vencimientos|sin vencimientos|no se encontraron cuotas|no hay cuotas/i),
      ).toBeInTheDocument()
    })

    it('should not render "Marcar pagado" buttons when items is empty', () => {
      render(<DueInstallmentsTable items={[]} onMarkAsPaid={mockOnMarkAsPaid} />)

      const buttons = screen.queryAllByRole('button', { name: /marcar.*pagad/i })
      expect(buttons).toHaveLength(0)
    })
  })

  describe('Given edge cases in installment fields', () => {
    it('should handle installments with null totalAmount without crashing', () => {
      const itemsWithNullAmount: InstallmentDetailedItem[] = [
        {
          ...mockItems[0],
          totalAmount: null,
          currency: null,
        },
      ]

      expect(() => {
        render(<DueInstallmentsTable items={itemsWithNullAmount} onMarkAsPaid={mockOnMarkAsPaid} />)
      }).not.toThrow()

      expect(screen.getByText('JUAN CARLOS PEREZ')).toBeInTheDocument()
    })

    it('should handle installments with null policyNumber gracefully', () => {
      const itemsWithNullPolicy: InstallmentDetailedItem[] = [
        {
          ...mockItems[0],
          policyNumber: null,
        },
      ]

      expect(() => {
        render(<DueInstallmentsTable items={itemsWithNullPolicy} onMarkAsPaid={mockOnMarkAsPaid} />)
      }).not.toThrow()

      expect(screen.getByText('JUAN CARLOS PEREZ')).toBeInTheDocument()
    })
  })

  describe('Batch manual reminder dispatch (Lote)', () => {
    let mockOnDispatchBatch: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockOnDispatchBatch = vi.fn()
    })

    it('T-01: should render "Enviar recordatorios de hoy" button in header when there are pending installments', () => {
      render(
        <DueInstallmentsTable
          items={mockItems}
          onMarkAsPaid={mockOnMarkAsPaid}
          onDispatchBatch={mockOnDispatchBatch}
        />,
      )

      const batchButton = screen.getByRole('button', { name: /enviar recordatorios de hoy/i })
      expect(batchButton).toBeInTheDocument()
      expect(batchButton).toBeEnabled()
    })

    it('T-02: should disable batch button when there are no pending installments', () => {
      const allPaidItems: InstallmentDetailedItem[] = [
        { ...mockItems[0], status: 'paid' },
        { ...mockItems[1], status: 'paid' },
      ]

      render(
        <DueInstallmentsTable
          items={allPaidItems}
          onMarkAsPaid={mockOnMarkAsPaid}
          onDispatchBatch={mockOnDispatchBatch}
        />,
      )

      const batchButton = screen.getByRole('button', { name: /enviar recordatorios/i })
      expect(batchButton).toBeDisabled()
    })

    it('T-03: should disable batch button and show "Enviando recordatorios..." when isDispatchingBatch is true', () => {
      render(
        <DueInstallmentsTable
          items={mockItems}
          onMarkAsPaid={mockOnMarkAsPaid}
          onDispatchBatch={mockOnDispatchBatch}
          isDispatchingBatch={true}
        />,
      )

      const batchButton = screen.getByRole('button', {
        name: /enviando recordatorios|enviar recordatorios/i,
      })
      expect(batchButton).toBeDisabled()
      expect(screen.getByText(/enviando recordatorios/i)).toBeInTheDocument()
      expect(batchButton).toHaveAttribute('aria-busy', 'true')
    })

    it('T-04: should call onDispatchBatch callback when clicking batch button', () => {
      render(
        <DueInstallmentsTable
          items={mockItems}
          onMarkAsPaid={mockOnMarkAsPaid}
          onDispatchBatch={mockOnDispatchBatch}
        />,
      )

      const batchButton = screen.getByRole('button', { name: /enviar recordatorios de hoy/i })
      fireEvent.click(batchButton)

      expect(mockOnDispatchBatch).toHaveBeenCalledTimes(1)
    })

    it('T-08: should render inline Alert with batch summary breakdown (totalEnqueued, totalSkipped, etc.)', () => {
      const summary: ReminderDispatchSummary = {
        scheduledDate: '2026-09-23',
        totalEvaluated: 12,
        totalEnqueued: 10,
        totalSkipped: 2,
        totalAlreadySent: 1,
        errors: [],
      }

      render(
        <DueInstallmentsTable
          items={mockItems}
          onMarkAsPaid={mockOnMarkAsPaid}
          batchSummary={summary}
        />,
      )

      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(within(alert).getByText(/10/)).toBeInTheDocument()
      expect(within(alert).getByText(/2/)).toBeInTheDocument()
    })

    it('T-09: should allow dismissing/removing the alert banner when clicking close button', () => {
      const mockOnDismissAlert = vi.fn()
      const summary: ReminderDispatchSummary = {
        scheduledDate: '2026-09-23',
        totalEvaluated: 5,
        totalEnqueued: 5,
        totalSkipped: 0,
        totalAlreadySent: 0,
        errors: [],
      }

      render(
        <DueInstallmentsTable
          items={mockItems}
          onMarkAsPaid={mockOnMarkAsPaid}
          batchSummary={summary}
          onDismissAlert={mockOnDismissAlert}
        />,
      )

      const alert = screen.getByRole('alert')
      const closeButton = within(alert).getByRole('button', { name: /cerrar|close/i })
      fireEvent.click(closeButton)

      expect(mockOnDismissAlert).toHaveBeenCalledTimes(1)
    })
  })

  describe('Individual manual reminder dispatch (Por cuota)', () => {
    let mockOnDispatchInstallment: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockOnDispatchInstallment = vi.fn()
    })

    it('T-05: should render "Notificar" / WhatsApp button for each pending installment with accessible aria-label', () => {
      render(
        <DueInstallmentsTable
          items={mockItems}
          onMarkAsPaid={mockOnMarkAsPaid}
          onDispatchInstallment={mockOnDispatchInstallment}
        />,
      )

      const notifyBtn1 = screen.getByRole('button', {
        name: /recordatorio.*whatsapp.*juan carlos perez|notificar.*juan carlos perez/i,
      })
      const notifyBtn2 = screen.getByRole('button', {
        name: /recordatorio.*whatsapp.*maria elena lopez|notificar.*maria elena lopez/i,
      })

      expect(notifyBtn1).toBeInTheDocument()
      expect(notifyBtn2).toBeInTheDocument()
    })

    it('T-06: should disable "Notificar" button for installments with status "paid"', () => {
      const itemsWithPaid: InstallmentDetailedItem[] = [
        {
          ...mockItems[0],
          status: 'paid',
        },
        mockItems[1],
      ]

      render(
        <DueInstallmentsTable
          items={itemsWithPaid}
          onMarkAsPaid={mockOnMarkAsPaid}
          onDispatchInstallment={mockOnDispatchInstallment}
        />,
      )

      const notifyBtn1 = screen.getByRole('button', {
        name: /recordatorio.*whatsapp.*juan carlos perez|notificar.*juan carlos perez/i,
      })
      expect(notifyBtn1).toBeDisabled()

      const notifyBtn2 = screen.getByRole('button', {
        name: /recordatorio.*whatsapp.*maria elena lopez|notificar.*maria elena lopez/i,
      })
      expect(notifyBtn2).toBeEnabled()
    })

    it('T-07: should display spinner or loading state exclusively on the row currently dispatching', () => {
      render(
        <DueInstallmentsTable
          items={mockItems}
          onMarkAsPaid={mockOnMarkAsPaid}
          onDispatchInstallment={mockOnDispatchInstallment}
          isDispatchingInstallment={(id: string) => id === mockItems[0].installmentId}
        />,
      )

      const notifyBtn1 = screen.getByRole('button', {
        name: /recordatorio.*whatsapp.*juan carlos perez|notificar.*juan carlos perez/i,
      })
      const notifyBtn2 = screen.getByRole('button', {
        name: /recordatorio.*whatsapp.*maria elena lopez|notificar.*maria elena lopez/i,
      })

      const isRow1Loading =
        notifyBtn1.getAttribute('aria-busy') === 'true' ||
        notifyBtn1.querySelector('.animate-spin') !== null ||
        notifyBtn1.hasAttribute('disabled')
      expect(isRow1Loading).toBe(true)

      expect(notifyBtn2).not.toHaveAttribute('aria-busy', 'true')
      expect(notifyBtn2.querySelector('.animate-spin')).toBeNull()
      expect(notifyBtn2).toBeEnabled()
    })
  })

  describe('Conflict 409 handling and confirmation modal', () => {
    let mockOnDispatchInstallment: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockOnDispatchInstallment = vi.fn()
    })

    it('T-10: should open confirmation modal when dispatching an installment that responds with 409 Conflict', () => {
      render(
        <DueInstallmentsTable
          items={mockItems}
          onMarkAsPaid={mockOnMarkAsPaid}
          onDispatchInstallment={mockOnDispatchInstallment}
          conflictInstallment={mockItems[0]}
        />,
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      expect(within(dialog).getByText(/ya.*(enviado|notific)/i)).toBeInTheDocument()
      expect(within(dialog).getByText(/JUAN CARLOS PEREZ/i)).toBeInTheDocument()
    })

    it('T-11: should call onDispatchInstallment with forceResend=true when clicking "Reenviar recordatorio" in modal', () => {
      const mockOnConfirmForceResend = vi.fn()

      render(
        <DueInstallmentsTable
          items={mockItems}
          onMarkAsPaid={mockOnMarkAsPaid}
          onDispatchInstallment={mockOnDispatchInstallment}
          conflictInstallment={mockItems[0]}
          onConfirmForceResend={mockOnConfirmForceResend}
        />,
      )

      const dialog = screen.getByRole('dialog')
      const resendBtn = within(dialog).getByRole('button', { name: /reenviar/i })
      fireEvent.click(resendBtn)

      expect(
        mockOnConfirmForceResend.mock.calls.length > 0 ||
        mockOnDispatchInstallment.mock.calls.some(
          ([id, force]) => id === mockItems[0].installmentId && force === true,
        ),
      ).toBe(true)
    })

    it('T-12: should close the confirmation modal without resending when clicking "Cancelar"', () => {
      const mockOnCancelConflict = vi.fn()

      render(
        <DueInstallmentsTable
          items={mockItems}
          onMarkAsPaid={mockOnMarkAsPaid}
          onDispatchInstallment={mockOnDispatchInstallment}
          conflictInstallment={mockItems[0]}
          onCancelConflict={mockOnCancelConflict}
        />,
      )

      const dialog = screen.getByRole('dialog')
      const cancelBtn = within(dialog).getByRole('button', { name: /cancelar/i })
      fireEvent.click(cancelBtn)

      expect(mockOnCancelConflict).toHaveBeenCalledTimes(1)
      expect(mockOnDispatchInstallment).not.toHaveBeenCalledWith(mockItems[0].installmentId, true)
    })
  })
})

