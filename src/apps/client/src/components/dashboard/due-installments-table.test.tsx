import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as ComponentModule from './due-installments-table'
import type { InstallmentDetailedItem } from '@copas/contracts'

const DueInstallmentsTable =
  (ComponentModule as any).DueInstallmentsTable ?? (ComponentModule as any).default

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
})
