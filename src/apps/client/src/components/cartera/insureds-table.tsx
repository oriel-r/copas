import React, { useState } from 'react'
import type { InsuredDetailedItem } from '@copas/contracts'

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
}

export const InsuredsTable: React.FC<InsuredsTableProps> = ({
  items,
  insureds,
  isLoading,
  onLoadMore,
  hasMore,
}) => {
  const data = items || insureds || []
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (isLoading && data.length === 0) {
    return <div className="p-8 text-center text-zinc-400">Cargando...</div>
  }

  if (data.length === 0) {
    return (
      <div className="p-8 text-center bg-zinc-900/50 rounded-lg border border-zinc-800">
        <p className="text-zinc-400">No se encontraron asegurados con los filtros seleccionados.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-zinc-400 uppercase bg-zinc-900 border-b border-zinc-800">
            <tr>
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3">Asegurado</th>
              <th className="px-4 py-3">Compañías</th>
              <th className="px-4 py-3 text-right">Pólizas activas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data.map(item => (
              <React.Fragment key={item.id}>
                <tr 
                  className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  onClick={() => toggleRow(item.id)}
                >
                  <td className="px-4 py-3 text-zinc-400">
                    {expandedRows[item.id] ? (
                      <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    ) : (
                      <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{item.fullName}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.companies.length > 0 ? item.companies.map(c => (
                        <span key={c} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs">
                          {c}
                        </span>
                      )) : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {item.activePoliciesCount}
                  </td>
                </tr>
                {expandedRows[item.id] && (
                  <tr className="bg-zinc-950/50">
                    <td colSpan={4} className="px-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-1 space-y-3">
                          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contacto y Fiscal</h4>
                          <div className="space-y-1 text-sm text-zinc-300">
                            <div><span className="text-zinc-500">CUIT:</span> {item.cuit || '-'}</div>
                            <div><span className="text-zinc-500">Teléfono:</span> {item.phone || '-'}</div>
                            <div><span className="text-zinc-500">Email:</span> {item.email || '-'}</div>
                          </div>
                        </div>
                        <div className="md:col-span-3 space-y-3">
                          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pólizas Asociadas</h4>
                          {item.policies.length > 0 ? (
                            <div className="border border-zinc-800 rounded overflow-hidden">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                                  <tr>
                                    <th className="px-3 py-2 font-medium">N° Póliza</th>
                                    <th className="px-3 py-2 font-medium">Compañía</th>
                                    <th className="px-3 py-2 font-medium">Rama / Bien</th>
                                    <th className="px-3 py-2 font-medium">Vigencia</th>
                                    <th className="px-3 py-2 font-medium text-right">Estado</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                  {item.policies.map(p => (
                                    <tr key={p.id}>
                                      <td className="px-3 py-2 text-white font-medium flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-zinc-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                        {p.policyNumber}
                                      </td>
                                      <td className="px-3 py-2 text-zinc-300">{p.companyName}</td>
                                      <td className="px-3 py-2 text-zinc-300">
                                        <div className="font-medium text-white">{p.branchName}</div>
                                        <div className="text-[10px] text-zinc-500 line-clamp-1">{p.assetDescription}</div>
                                      </td>
                                      <td className="px-3 py-2 text-zinc-400">
                                        {p.startDate} - {p.endDate}
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${
                                          p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                                          p.status === 'expired' ? 'bg-amber-500/10 text-amber-400' :
                                          'bg-red-500/10 text-red-400'
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
                            <div className="text-sm text-zinc-500 py-2">No hay pólizas asociadas.</div>
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
          <button 
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-md hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Cargando...' : 'Cargar más'}
          </button>
        </div>
      )}
    </div>
  )
}
