import React, { useState } from 'react'
import { Button } from '@copas/ui'
import { usePoliciesByInsured } from '@/lib/api/use-insured-detail'
import { PolicyItemCard } from './policy-item-card'
import type { UpdatePolicyRequest } from '@copas/contracts'

export interface AdditionalPoliciesSectionProps {
  insuredId: string
  totalPoliciesCount: number
  alreadyLoadedCount: number
  onUpdatePolicy?: (policyId: string, data: Partial<UpdatePolicyRequest>) => Promise<void> | void
  updatingPolicyId?: string | null
  updateError?: Error | null
}

export const AdditionalPoliciesSection: React.FC<AdditionalPoliciesSectionProps> = ({
  insuredId,
  totalPoliciesCount,
  alreadyLoadedCount,
  onUpdatePolicy,
  updatingPolicyId,
  updateError,
}) => {
  const [shouldFetch, setShouldFetch] = useState(false)
  const { data, isLoading, error } = usePoliciesByInsured(shouldFetch ? insuredId : null)

  const remaining = totalPoliciesCount - alreadyLoadedCount
  if (remaining <= 0 && !shouldFetch) {
    return null
  }

  const handleLoadMore = () => {
    setShouldFetch(true)
  }

  return (
    <div className="space-y-3 pt-2">
      {!shouldFetch ? (
        <div className="text-center pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            className="w-full text-xs"
          >
            Ver más pólizas ({remaining} {remaining === 1 ? 'restante' : 'restantes'})
          </Button>
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="py-4 text-center text-xs text-muted-foreground">
              Cargando historial de pólizas...
            </div>
          )}
          {error && (
            <div className="py-2 text-center text-xs text-destructive">
              Error al cargar pólizas adicionales.
            </div>
          )}
          {data?.items && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Historial Completo de Pólizas
              </h4>
              {data.items.map((policy) => (
                <PolicyItemCard
                  key={policy.id}
                  policy={policy}
                  insuredId={insuredId}
                  isLatestActive={false}
                  onUpdatePolicy={onUpdatePolicy ? (d) => onUpdatePolicy(policy.id, d) : undefined}
                  isUpdating={updatingPolicyId === policy.id}
                  error={updatingPolicyId === policy.id ? updateError : null}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
