import React, { useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { CarteraFilters } from '@/components/cartera/cartera-filters'
import { InsuredsTable } from '@/components/cartera/insureds-table'
import { useInsureds, useInsuredFilterOptions } from '@/lib/api/use-insureds'
import type { InsuredsFilter } from '@copas/contracts'

export const CarteraPage: React.FC = () => {
  const [filters, setFilters] = useState<InsuredsFilter>({})
  
  const { data: optionsData, isLoading: isLoadingOptions } = useInsuredFilterOptions()
  const { data: insuredsData, isLoading: isLoadingInsureds } = useInsureds(filters)

  const handleFilterChange = (newFilters: InsuredsFilter) => {
    setFilters(newFilters)
  }

  const handleReset = () => {
    setFilters({})
  }

  return (
    <AppShell>
      <div className="w-full max-w-[1700px] mx-auto px-3 sm:px-5 py-4 relative">
        <div className="flex flex-col gap-4">
          <div className="mb-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Cartera de Asegurados</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Gestioná y consultá el detalle de tu cartera de asegurados y sus pólizas.</p>
          </div>

          <CarteraFilters 
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
            companies={optionsData?.companies}
            branches={optionsData?.branches}
            isLoading={isLoadingOptions}
          />

          <div className="w-full">
            <InsuredsTable 
              items={insuredsData?.items || []}
              isLoading={isLoadingInsureds}
              total={insuredsData?.total || 0}
              limit={filters.limit || 50}
              offset={filters.offset || 0}
            />
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default CarteraPage
