import React, { useState } from 'react'
import type { InsuredDetailedItem } from '@copas/contracts'
import { Button } from '@copas/ui'

export interface InsuredsTableProps {
  items?: InsuredDetailedItem[]
  insureds?: InsuredDetailedItem[]
  isLoading?: boolean
  total?: number
  limit?: number
  offset?: number
  onPageChange?: (offset: number) => void
  onLoadMore?: () => void
  hasMore?: boolean
  onSelectInsured?: (id: string) => void
}

export const InsuredsTable: React.FC<InsuredsTableProps> = ({
  items,
  insureds,
  isLoading,
  onLoadMore,
  hasMore,
  onSelectInsured,
}) => {
  const data = items || insureds || []
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleRowClick = (id: string) => {
    if (onSelectInsured) {
      onSelectInsured(id)
    } else {
      toggleRow(id)
    }
  }

  if (isLoading && data.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">Cargando...</div>
  }

  if (data.length === 0) {
    return (
      <div className="p-8 text-center bg-card rounded-lg border border-border shadow-xs">
        <p className="text-muted-foreground">No se encontraron asegurados con los filtros seleccionados.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="border border-border rounded-lg overflow-hidden bg-card shadow-xs">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3">Asegurado</th>
              <th className="px-4 py-3">Compañías</th>
              <th className="px-4 py-3 text-right">Pólizas activas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map(item => (
              <React.Fragment key={item.id}>
                <tr 
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(item.id)}
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {expandedRows[item.id] ? (
                      <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    ) : (
                      <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{item.fullName}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.companies.length > 0 ? item.companies.map(c => (
                        <span key={c} className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs border border-border/40">
                          {c}
                        </span>
                      )) : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground font-medium">
                    {item.activePoliciesCount}
                  </td>
                </tr>
                {expandedRows[item.id] && (
                  <tr className="bg-muted/20 border-t border-border">
                    <td colSpan={4} className="px-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-1 space-y-3">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacto y Fiscal</h4>
                          <div className="space-y-1 text-sm text-foreground">
                            <div><span className="text-muted-foreground">CUIT:</span> {item.cuit || '-'}</div>
                            <div><span className="text-muted-foreground">Teléfono:</span> {item.phone || '-'}</div>
                            <div><span className="text-muted-foreground">Email:</span> {item.email || '-'}</div>
                          </div>
                        </div>
                        <div className="md:col-span-3 space-y-3">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pólizas Asociadas</h4>
                          {item.policies.length > 0 ? (
                            <div className="border border-border rounded overflow-hidden">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-muted/60 text-muted-foreground border-b border-border">
                                  <tr>
                                    <th className="px-3 py-2 font-medium">N° Póliza</th>
                                    <th className="px-3 py-2 font-medium">Compañía</th>
                                    <th className="px-3 py-2 font-medium">Rama / Bien</th>
                                    <th className="px-3 py-2 font-medium">Vigencia</th>
                                    <th className="px-3 py-2 font-medium text-right">Estado</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {item.policies.map(p => (
                                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                      <td className="px-3 py-2 text-foreground font-medium flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                        {p.policyNumber}
                                      </td>
                                      <td className="px-3 py-2 text-muted-foreground">{p.companyName}</td>
                                      <td className="px-3 py-2 text-muted-foreground">
                                        <div className="font-medium text-foreground">{p.branchName}</div>
                                        <div className="text-[10px] text-muted-foreground line-clamp-1">{p.assetDescription}</div>
                                      </td>
                                      <td className="px-3 py-2 text-muted-foreground">
                                        {p.startDate} - {p.endDate}
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border ${
                                          p.status === 'active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' :
                                          p.status === 'expired' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' :
                                          'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'
                                        }`}>
                                          {p.status === 'active' ? 'Activa' : p.status === 'expired' ? 'Vencida' : 'Cancelada'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground py-2">No hay pólizas asociadas.</div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      
      {hasMore && onLoadMore && (
        <div className="mt-4 text-center">
          <Button 
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Cargando...' : 'Cargar más'}
          </Button>
        </div>
      )}
    </div>
  )
}
