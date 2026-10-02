import React, { useState } from 'react'
import { Button } from '@copas/ui'
import { formatCurrency } from '@/lib/formatters'
import { usePolicyInstallments, useToggleInstallmentStatus } from '@/lib/api/use-insured-detail'

export interface InstallmentsAccordionProps {
  policyId: string
  defaultOpen?: boolean
}

export const InstallmentsAccordion: React.FC<InstallmentsAccordionProps> = ({
  policyId,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const { data, isLoading, error } = usePolicyInstallments(isOpen ? policyId : null)
  const toggleMutation = useToggleInstallmentStatus()

  const handleToggle = () => {
    setIsOpen((prev) => !prev)
  }

  const handleStatusChange = (installmentId: string, currentStatus: string) => {
    toggleMutation.mutate({
      installmentId,
      policyId,
      currentStatus,
    })
  }

  return (
    <div className="border border-border/80 rounded-md overflow-hidden mt-3 bg-muted/20">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full px-3 py-2 text-xs font-semibold text-foreground flex items-center justify-between hover:bg-muted/40 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-1.5">
          <span>Cuotas de la póliza</span>
          {data?.items && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
              {data.items.length}
            </span>
          )}
        </span>
        <span className="text-muted-foreground text-xs">{isOpen ? '▲ Ocultar' : '▼ Ver cuotas'}</span>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-border/60 bg-card">
          {isLoading && <div className="py-3 text-center text-xs text-muted-foreground">Cargando cuotas...</div>}
          {error && <div className="py-2 text-center text-xs text-destructive">Error al cargar cuotas.</div>}
          {!isLoading && !error && (!data?.items || data.items.length === 0) && (
            <div className="py-3 text-center text-xs text-muted-foreground">
              No se registran cuotas emitidas para esta póliza.
            </div>
          )}
          {data?.items && data.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-muted-foreground uppercase border-b border-border/60">
                  <tr>
                    <th className="py-1.5 px-2">N°</th>
                    <th className="py-1.5 px-2">Vencimiento</th>
                    <th className="py-1.5 px-2 text-right">Monto</th>
                    <th className="py-1.5 px-2 text-center">Estado</th>
                    <th className="py-1.5 px-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {data.items.map((item) => (
                    <tr key={item.installmentId} className="hover:bg-muted/30">
                      <td className="py-2 px-2 font-medium">{item.installmentNumber}</td>
                      <td className="py-2 px-2 text-muted-foreground">{item.dueDate || '-'}</td>
                      <td className="py-2 px-2 text-right font-medium">
                        {formatCurrency(item.totalAmount, item.currency || 'ARS')}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                            item.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                              : item.status === 'overdue'
                              ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                          }`}
                        >
                          {item.status === 'paid' ? 'Pagada' : item.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          disabled={
                            toggleMutation.isPending &&
                            toggleMutation.variables?.installmentId === item.installmentId
                          }
                          onClick={() => handleStatusChange(item.installmentId, item.status)}
                        >
                          {toggleMutation.isPending &&
                          toggleMutation.variables?.installmentId === item.installmentId
                            ? '...'
                            : item.status === 'paid'
                            ? 'Marcar pendiente'
                            : 'Marcar pagada'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
