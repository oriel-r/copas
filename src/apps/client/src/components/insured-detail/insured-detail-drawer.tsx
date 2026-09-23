import React, { useEffect, useRef } from 'react'
import { useInsuredDrawer } from '@/lib/hooks/use-insured-drawer'
import {
  useInsuredDetail,
  useUpdateInsured,
  useUpdatePolicy,
} from '@/lib/api/use-insured-detail'
import { DrawerHeader } from './drawer-header'
import { InsuredProfileCard } from './insured-profile-card'
import { PolicyItemCard } from './policy-item-card'
import { AdditionalPoliciesSection } from './additional-policies-section'
import { Button } from '@copas/ui'
import type { UpdatePolicyRequest } from '@copas/contracts'

export interface InsuredDetailDrawerProps {
  insuredId?: string | null
  isOpen?: boolean
  onClose?: () => void
}

export const InsuredDetailDrawer: React.FC<InsuredDetailDrawerProps> = ({
  insuredId: propInsuredId,
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const drawer = useInsuredDrawer()

  const activeInsuredId = propInsuredId !== undefined ? propInsuredId : drawer.insuredId
  const isDrawerOpen = propIsOpen !== undefined ? propIsOpen : drawer.isOpen
  const handleClose = propOnClose !== undefined ? propOnClose : drawer.close

  if (!isDrawerOpen || !activeInsuredId) {
    return null
  }

  return <InsuredDetailDrawerContent activeInsuredId={activeInsuredId} handleClose={handleClose} />
}

const InsuredDetailDrawerContent: React.FC<{ activeInsuredId: string; handleClose: () => void }> = ({
  activeInsuredId,
  handleClose,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null)

  const { data: insured, isLoading, error } = useInsuredDetail(activeInsuredId)
  const updateInsuredMutation = useUpdateInsured()
  const updatePolicyMutation = useUpdatePolicy()

  // ESC key listener & body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose])

  const handleUpdateInsured = async (data: any) => {
    await updateInsuredMutation.mutateAsync({
      id: activeInsuredId,
      data,
    })
  }

  const handleUpdatePolicy = async (policyId: string, data: Partial<UpdatePolicyRequest>) => {
    await updatePolicyMutation.mutateAsync({
      id: policyId,
      insuredId: activeInsuredId,
      data,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insured-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-300 ease-out"
        onClick={handleClose}
        data-testid="drawer-backdrop"
      />

      {/* Slide-over Drawer Panel */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-xl sm:max-w-2xl bg-card border-l border-border shadow-2xl h-full flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-300 ease-out"
      >
        {isLoading && (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto animate-pulse">
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-48 bg-muted rounded"></div>
          </div>
        )}

        {error && (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-3">
            <div className="text-destructive font-medium text-base">
              {error.message || 'Asegurado no encontrado'}
            </div>
            <p className="text-xs text-muted-foreground">
              No se pudo cargar la información del asegurado solicitado.
            </p>
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cerrar panel
            </Button>
          </div>
        )}

        {!isLoading && !error && insured && (
          <>
            <DrawerHeader
              fullName={insured.fullName}
              companies={insured.companies}
              activePoliciesCount={insured.activePoliciesCount}
              totalPoliciesCount={insured.totalPoliciesCount}
              onClose={handleClose}
            />

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <InsuredProfileCard
                insured={insured}
                onUpdate={handleUpdateInsured}
                isUpdating={updateInsuredMutation.isPending}
                error={updateInsuredMutation.error}
              />

              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pólizas
                </h3>

                {insured.latestPolicy ? (
                  <PolicyItemCard
                    policy={insured.latestPolicy}
                    insuredId={insured.id}
                    isLatestActive={true}
                    onUpdatePolicy={(data) => handleUpdatePolicy(insured.latestPolicy!.id, data)}
                    isUpdating={updatePolicyMutation.isPending && (updatePolicyMutation.variables as any)?.id === insured.latestPolicy.id}
                    error={(updatePolicyMutation.variables as any)?.id === insured.latestPolicy.id ? updatePolicyMutation.error : null}
                  />
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20 border border-border rounded-lg">
                    No hay pólizas registradas para este asegurado.
                  </div>
                )}

                {insured.totalPoliciesCount > 1 && (
                  <AdditionalPoliciesSection
                    insuredId={insured.id}
                    totalPoliciesCount={insured.totalPoliciesCount}
                    alreadyLoadedCount={insured.latestPolicy ? 1 : 0}
                    onUpdatePolicy={handleUpdatePolicy}
                    updatingPolicyId={updatePolicyMutation.isPending ? (updatePolicyMutation.variables as any)?.id : null}
                    updateError={updatePolicyMutation.error}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
