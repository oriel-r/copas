import React, { useState } from 'react'
import type { InsuredPolicySummary, PolicyDetailedItem, UpdatePolicyRequest } from '@copas/contracts'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@copas/ui'
import { formatCurrency } from '@/lib/formatters'
import { InstallmentsAccordion } from './installments-accordion'

export interface PolicyItemCardProps {
  policy: InsuredPolicySummary | PolicyDetailedItem
  insuredId: string
  isLatestActive?: boolean
  onUpdatePolicy?: (data: UpdatePolicyRequest) => Promise<void> | void
  isUpdating?: boolean
}

export const PolicyItemCard: React.FC<PolicyItemCardProps> = ({
  policy,
  insuredId: _insuredId,
  isLatestActive = false,
  onUpdatePolicy,
  isUpdating = false,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    policyNumber: policy.policyNumber || '',
    status: policy.status || 'active',
    startDate: policy.startDate || '',
    endDate: policy.endDate || '',
    premiumTotal: (policy as any).premiumTotal ? String((policy as any).premiumTotal) : '',
    currency: (policy as any).currency || 'ARS',
  })
  const [dateError, setDateError] = useState<string | null>(null)

  const handleEditClick = () => {
    setFormData({
      policyNumber: policy.policyNumber || '',
      status: policy.status || 'active',
      startDate: policy.startDate || '',
      endDate: policy.endDate || '',
      premiumTotal: (policy as any).premiumTotal ? String((policy as any).premiumTotal) : '',
      currency: (policy as any).currency || 'ARS',
    })
    setDateError(null)
    setIsEditing(true)
  }

  const handleCancelClick = () => {
    setIsEditing(false)
    setDateError(null)
  }

  const validate = () => {
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      setDateError('La fecha de inicio debe ser anterior o igual a la fecha de fin')
      return false
    }
    setDateError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    if (onUpdatePolicy) {
      await onUpdatePolicy({
        policyNumber: formData.policyNumber.trim(),
        status: formData.status as any,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        premiumTotal: formData.premiumTotal ? Number(formData.premiumTotal) : undefined,
        currency: formData.currency as any,
      })
      setIsEditing(false)
    }
  }

  return (
    <Card className="border border-border shadow-xs">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <span>Póliza {policy.policyNumber}</span>
            {isLatestActive && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                Última Activa
              </span>
            )}
          </CardTitle>
        </div>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={handleEditClick}>
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            {dateError && <div className="text-xs text-destructive">{dateError}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="policyNumber" className="block text-xs font-medium text-foreground mb-1">
                  Número de Póliza
                </label>
                <input
                  id="policyNumber"
                  type="text"
                  value={formData.policyNumber}
                  onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded border border-input bg-background text-foreground"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-xs font-medium text-foreground mb-1">
                  Estado
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-sm rounded border border-input bg-background text-foreground"
                >
                  <option value="active">Activa</option>
                  <option value="expired">Vencida</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="startDate" className="block text-xs font-medium text-foreground mb-1">
                  Fecha Inicio
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded border border-input bg-background text-foreground"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-xs font-medium text-foreground mb-1">
                  Fecha Fin
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded border border-input bg-background text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="premiumTotal" className="block text-xs font-medium text-foreground mb-1">
                  Prima Total
                </label>
                <input
                  id="premiumTotal"
                  type="number"
                  step="any"
                  value={formData.premiumTotal}
                  onChange={(e) => setFormData({ ...formData, premiumTotal: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded border border-input bg-background text-foreground"
                />
              </div>

              <div>
                <label htmlFor="currency" className="block text-xs font-medium text-foreground mb-1">
                  Moneda
                </label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded border border-input bg-background text-foreground"
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCancelClick} disabled={isUpdating}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isUpdating}>
                {isUpdating ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground text-xs block">Compañía</span>
                <span className="font-medium text-foreground">{policy.companyName}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs block">Rama / Bien</span>
                <span className="font-medium text-foreground">{policy.branchName}</span>
                <div className="text-xs text-muted-foreground">{policy.assetDescription}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-muted-foreground text-xs block">Vigencia</span>
                <span className="font-medium text-foreground">
                  {policy.startDate || '-'} al {policy.endDate || '-'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs block">Estado</span>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                    policy.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                      : policy.status === 'expired'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                      : 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'
                  }`}
                >
                  {policy.status === 'active' ? 'Activa' : policy.status === 'expired' ? 'Vencida' : 'Cancelada'}
                </span>
              </div>
            </div>

            {(policy as any).premiumTotal !== undefined && (policy as any).premiumTotal !== null && (
              <div className="pt-1">
                <span className="text-muted-foreground text-xs block">Prima Total</span>
                <span className="font-medium text-foreground">
                  {formatCurrency((policy as any).premiumTotal, (policy as any).currency || 'ARS')}
                </span>
              </div>
            )}
          </div>
        )}

        <InstallmentsAccordion policyId={policy.id} />
      </CardContent>
    </Card>
  )
}
