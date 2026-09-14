import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as ComponentModule from './insureds-table'
import type { InsuredDetailedItem } from '@copas/contracts'

const InsuredsTable =
  (ComponentModule as any).InsuredsTable ?? (ComponentModule as any).default

describe('InsuredsTable Component', () => {
  const mockInsureds: InsuredDetailedItem[] = [
    {
      id: '018f9e2b-1111-7000-8000-000000000001',
      fullName: 'JUAN CARLOS PEREZ',
      cuit: '20-12345678-9',
      phone: '+54 11 1234-5678',
      email: 'juan.perez@example.com',
      birthDate: '1985-05-20',
      companies: ['Federación Patronal', 'Sancor Seguros'],
      activePoliciesCount: 2,
      policies: [
        {
          id: 'pol-1',
          policyNumber: 'POL-100200',
          companyId: 'comp-1',
          companyName: 'Federación Patronal',
          branchId: 'branch-1',
          branchName: 'Automotores',
          assetDescription: 'Toyota Corolla (AB123CD)',
          startDate: '2026-01-01',
          endDate: '2027-01-01',
          status: 'active',
        },
        {
          id: 'pol-2',
          policyNumber: 'POL-300400',
          companyId: 'comp-2',
          companyName: 'Sancor Seguros',
          branchId: 'branch-2',
          branchName: 'Hogar',
          assetDescription: 'Av. Corrientes 1234, CABA',
          startDate: '2025-06-01',
          endDate: '2026-06-01',
          status: 'active',
        },
      ],
    },
    {
      id: '018f9e2b-2222-7000-8000-000000000002',
      fullName: 'MARIA ELENA LOPEZ',
      cuit: '27-98765432-1',
      phone: '+54 11 9876-5432',
      email: 'maria.lopez@example.com',
      birthDate: '1992-11-10',
      companies: ['La Segunda'],
      activePoliciesCount: 0,
      policies: [
        {
          id: 'pol-3',
          policyNumber: 'POL-555666',
          companyId: 'comp-3',
          companyName: 'La Segunda',
          branchId: 'branch-3',
          branchName: 'Vida',
          assetDescription: 'Seguro de Vida Colectivo',
          startDate: '2024-01-01',
          endDate: '2025-01-01',
          status: 'expired',
        },
      ],
    },
  ]

  function renderTable(props: { items?: InsuredDetailedItem[]; insureds?: InsuredDetailedItem[] } = {}) {
    const tableProps = {
      items: mockInsureds,
      insureds: mockInsureds,
      ...props,
    }
    return render(<InsuredsTable {...tableProps} />)
  }

  describe('Table Headers and Column Structure', () => {
    it('should render the "Asegurado" column header', () => {
      renderTable()

      const header = screen.getByText(/asegurado|nombre/i)
      expect(header).toBeInTheDocument()
    })

    it('should render the "Compañías" column header', () => {
      renderTable()

      const header = screen.getByText(/compañía|aseguradora/i)
      expect(header).toBeInTheDocument()
    })

    it('should render the "Pólizas activas" column header', () => {
      renderTable()

      const header = screen.getByText(/pólizas activas|activas/i)
      expect(header).toBeInTheDocument()
    })
  })

  describe('Insured Rows Rendering', () => {
    it('should render the full name of each insured', () => {
      renderTable()

      expect(screen.getByText('JUAN CARLOS PEREZ')).toBeInTheDocument()
      expect(screen.getByText('MARIA ELENA LOPEZ')).toBeInTheDocument()
    })

    it('should render company badges or names for each insured', () => {
      renderTable()

      expect(screen.getByText('Federación Patronal')).toBeInTheDocument()
      expect(screen.getByText('Sancor Seguros')).toBeInTheDocument()
      expect(screen.getByText('La Segunda')).toBeInTheDocument()
    })

    it('should render the active policies count for each insured', () => {
      renderTable()

      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })

  describe('Row Interaction and Contact / Policy Breakdown', () => {
    it('should display contact details (CUIT, phone, email) when expanding an insured row', async () => {
      renderTable()

      const perezRow = screen.getByText('JUAN CARLOS PEREZ').closest('tr') ?? screen.getByText('JUAN CARLOS PEREZ')
      fireEvent.click(perezRow)

      expect(screen.getByText(/20-?12345678-?9/)).toBeInTheDocument()
      expect(screen.getByText(/\+54 11 1234-5678|1112345678/)).toBeInTheDocument()
      expect(screen.getByText('juan.perez@example.com')).toBeInTheDocument()
    })

    it('should display associated policies breakdown with policy number, branch, and asset when expanded', async () => {
      renderTable()

      const perezRow = screen.getByText('JUAN CARLOS PEREZ').closest('tr') ?? screen.getByText('JUAN CARLOS PEREZ')
      fireEvent.click(perezRow)

      expect(screen.getByText('POL-100200')).toBeInTheDocument()
      expect(screen.getByText('Automotores')).toBeInTheDocument()
      expect(screen.getByText('Toyota Corolla (AB123CD)')).toBeInTheDocument()

      expect(screen.getByText('POL-300400')).toBeInTheDocument()
      expect(screen.getByText('Hogar')).toBeInTheDocument()
      expect(screen.getByText('Av. Corrientes 1234, CABA')).toBeInTheDocument()
    })
  })

  describe('Empty and Edge States', () => {
    it('should render empty state message when list of insureds is empty', () => {
      renderTable({ items: [], insureds: [] })

      const emptyMessage = screen.getByText(/no se encontraron asegurados|sin asegurados|no hay asegurados/i)
      expect(emptyMessage).toBeInTheDocument()
    })

    it('should render insured with null contact details (cuit, phone, email) without crashing', () => {
      const insuredWithNulls: InsuredDetailedItem = {
        id: '018f9e2b-null-7000-8000-000000000000',
        fullName: 'ANA SIN CONTACTO',
        cuit: null,
        phone: null,
        email: null,
        birthDate: null,
        companies: ['Federación Patronal'],
        activePoliciesCount: 1,
        policies: [],
      }

      expect(() => {
        renderTable({ items: [insuredWithNulls], insureds: [insuredWithNulls] })
      }).not.toThrow()

      expect(screen.getByText('ANA SIN CONTACTO')).toBeInTheDocument()
    })

    it('should handle insured with zero policies gracefully when expanded', () => {
      const insuredNoPolicies: InsuredDetailedItem = {
        id: '018f9e2b-zero-7000-8000-000000000000',
        fullName: 'CARLOS SIN POLIZAS',
        cuit: '20-33333333-9',
        phone: '+54 11 3333-3333',
        email: 'carlos@example.com',
        birthDate: '1980-01-01',
        companies: [],
        activePoliciesCount: 0,
        policies: [],
      }

      renderTable({ items: [insuredNoPolicies], insureds: [insuredNoPolicies] })

      const row = screen.getByText('CARLOS SIN POLIZAS')
      expect(() => {
        fireEvent.click(row)
      }).not.toThrow()
    })
  })
})
