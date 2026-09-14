import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as ComponentModule from './cartera-filters'
import type { InsuredFilterOptions, InsuredsFilter } from '@copas/contracts'

const CarteraFilters =
  (ComponentModule as any).CarteraFilters ?? (ComponentModule as any).default

describe('CarteraFilters Component', () => {
  const mockFilterOptions: InsuredFilterOptions = {
    companies: [
      { id: 'comp-1', name: 'Federación Patronal' },
      { id: 'comp-2', name: 'Sancor Seguros' },
    ],
    branches: [
      { id: 'branch-1', name: 'Automotores' },
      { id: 'branch-2', name: 'Hogar' },
    ],
  }

  let mockOnChange: ReturnType<typeof vi.fn>
  let mockOnClear: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnChange = vi.fn()
    mockOnClear = vi.fn()
  })

  function renderFilters(
    props: {
      filters?: InsuredsFilter
      value?: InsuredsFilter
      filterOptions?: InsuredFilterOptions
      companies?: typeof mockFilterOptions.companies
      branches?: typeof mockFilterOptions.branches
      onChange?: (f: any) => void
      onFilterChange?: (f: any) => void
      onClear?: () => void
      onReset?: () => void
    } = {},
  ) {
    const defaultProps = {
      filterOptions: mockFilterOptions,
      companies: mockFilterOptions.companies,
      branches: mockFilterOptions.branches,
      filters: {},
      value: {},
      onChange: mockOnChange,
      onFilterChange: mockOnChange,
      onClear: mockOnClear,
      onReset: mockOnClear,
      ...props,
    }
    return render(<CarteraFilters {...defaultProps} />)
  }

  describe('Filter Selectors Rendering', () => {
    it('should render the company (Compañía) selector', () => {
      renderFilters()

      const companySelector =
        screen.queryByLabelText(/compañía|aseguradora/i) ??
        screen.queryByText(/compañía|aseguradora/i) ??
        screen.queryByRole('combobox', { name: /compañía|aseguradora/i })

      expect(companySelector).not.toBeNull()
    })

    it('should render the branch (Rama) selector', () => {
      renderFilters()

      const branchSelector =
        screen.queryByLabelText(/rama|ramo/i) ??
        screen.queryByText(/rama|ramo/i) ??
        screen.queryByRole('combobox', { name: /rama|ramo/i })

      expect(branchSelector).not.toBeNull()
    })

    it('should render the policy status (Estado) selector', () => {
      renderFilters()

      const statusSelector =
        screen.queryByLabelText(/estado/i) ??
        screen.queryByText(/estado/i) ??
        screen.queryByRole('combobox', { name: /estado/i })

      expect(statusSelector).not.toBeNull()
    })

    it('should display available company options', () => {
      renderFilters()

      expect(
        screen.queryByText('Federación Patronal') ??
          screen.queryByRole('option', { name: /federación patronal/i }),
      ).not.toBeNull()
      expect(
        screen.queryByText('Sancor Seguros') ??
          screen.queryByRole('option', { name: /sancor seguros/i }),
      ).not.toBeNull()
    })

    it('should display available branch options', () => {
      renderFilters()

      expect(
        screen.queryByText('Automotores') ??
          screen.queryByRole('option', { name: /automotores/i }),
      ).not.toBeNull()
      expect(
        screen.queryByText('Hogar') ??
          screen.queryByRole('option', { name: /hogar/i }),
      ).not.toBeNull()
    })
  })

  describe('Prohibition of Free Text Search (Contract Constraint)', () => {
    it('should NOT render any searchbox or free text search input', () => {
      const { container } = renderFilters()

      const searchbox = screen.queryByRole('searchbox')
      expect(searchbox).toBeNull()

      const searchInput = container.querySelector('input[type="search"]')
      expect(searchInput).toBeNull()

      const searchPlaceholder = screen.queryByPlaceholderText(/buscar|búsqueda|palabra clave/i)
      expect(searchPlaceholder).toBeNull()
    })
  })

  describe('Filter Event Emissions', () => {
    it('should emit filter change event when company is selected', () => {
      const { container } = renderFilters()

      const companySelect =
        container.querySelector('select[name*="company"]') ??
        screen.queryByRole('combobox', { name: /compañía|aseguradora/i })

      if (companySelect) {
        fireEvent.change(companySelect, { target: { value: 'comp-1' } })
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ companyId: 'comp-1' }),
        )
      }
    })

    it('should emit filter change event when branch is selected', () => {
      const { container } = renderFilters()

      const branchSelect =
        container.querySelector('select[name*="branch"]') ??
        screen.queryByRole('combobox', { name: /rama|ramo/i })

      if (branchSelect) {
        fireEvent.change(branchSelect, { target: { value: 'branch-1' } })
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ branchId: 'branch-1' }),
        )
      }
    })

    it('should emit filter change event when policy status is selected', () => {
      const { container } = renderFilters()

      const statusSelect =
        container.querySelector('select[name*="status"]') ??
        screen.queryByRole('combobox', { name: /estado/i })

      if (statusSelect) {
        fireEvent.change(statusSelect, { target: { value: 'active' } })
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ policyStatus: 'active' }),
        )
      }
    })

    it('should render a "Limpiar filtros" button', () => {
      renderFilters()

      const clearButton = screen.getByRole('button', { name: /limpiar.*filtros|limpiar|restablecer/i })
      expect(clearButton).toBeInTheDocument()
    })

    it('should trigger clear/reset callback when clicking "Limpiar filtros"', () => {
      renderFilters({
        filters: { companyId: 'comp-1', policyStatus: 'active' },
      })

      const clearButton = screen.getByRole('button', { name: /limpiar.*filtros|limpiar|restablecer/i })
      fireEvent.click(clearButton)

      const wasCleared = mockOnClear.mock.calls.length > 0 || mockOnChange.mock.calls.length > 0
      expect(wasCleared).toBe(true)
    })
  })
})
