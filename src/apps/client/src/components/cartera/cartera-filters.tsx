import React from 'react'
import type { InsuredsFilter } from '@copas/contracts'
import { Button } from '@copas/ui'

export interface CarteraFiltersProps {
  companies?: { id: string; name: string }[]
  branches?: { id: string; name: string }[]
  filters?: InsuredsFilter
  onFilterChange?: (filters: InsuredsFilter) => void
  onReset?: () => void
  isLoading?: boolean
}

export const CarteraFilters: React.FC<CarteraFiltersProps> = ({
  companies = [],
  branches = [],
  filters = {},
  onFilterChange,
  onReset,
  isLoading
}) => {
  const handleValueChange = (key: keyof InsuredsFilter, value: string) => {
    if (onFilterChange) {
      onFilterChange({
        ...filters,
        [key]: value === 'all' ? undefined : value
      })
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-end bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
      <div className="flex-1 w-full flex flex-col gap-1.5">
        <label htmlFor="companyId" className="text-xs font-medium text-zinc-400">Compañía Aseguradora</label>
        <select
          id="companyId"
          disabled={isLoading}
          value={filters.companyId || 'all'}
          onChange={(e) => handleValueChange('companyId', e.target.value)}
          className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm ring-offset-zinc-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-800 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white"
          aria-label="Compañía Aseguradora"
        >
          <option value="all">Todas</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 w-full flex flex-col gap-1.5">
        <label htmlFor="branchId" className="text-xs font-medium text-zinc-400">Rama</label>
        <select
          id="branchId"
          disabled={isLoading}
          value={filters.branchId || 'all'}
          onChange={(e) => handleValueChange('branchId', e.target.value)}
          className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm ring-offset-zinc-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-800 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white"
          aria-label="Rama"
        >
          <option value="all">Todas</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 w-full flex flex-col gap-1.5">
        <label htmlFor="policyStatus" className="text-xs font-medium text-zinc-400">Estado de póliza</label>
        <select
          id="policyStatus"
          disabled={isLoading}
          value={filters.policyStatus || 'all'}
          onChange={(e) => handleValueChange('policyStatus', e.target.value)}
          className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm ring-offset-zinc-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-800 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white"
          aria-label="Estado de póliza"
        >
          <option value="all">Todas</option>
          <option value="active">Activas</option>
          <option value="expired">Vencidas</option>
          <option value="cancelled">Canceladas</option>
        </select>
      </div>

      <Button 
        variant="outline" 
        onClick={onReset} 
        disabled={isLoading || (!filters.companyId && !filters.branchId && !filters.policyStatus)}
      >
        Limpiar filtros
      </Button>
    </div>
  )
}
