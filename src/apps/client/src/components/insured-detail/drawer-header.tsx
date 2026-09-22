import React from 'react'
import { Button } from '@copas/ui'

export interface DrawerHeaderProps {
  fullName: string
  companies: string[]
  activePoliciesCount: number
  totalPoliciesCount: number
  onClose: () => void
}

export const DrawerHeader: React.FC<DrawerHeaderProps> = ({
  fullName,
  companies,
  activePoliciesCount,
  totalPoliciesCount,
  onClose,
}) => {
  return (
    <div className="flex items-start justify-between p-4 border-b border-border bg-card">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 id="insured-drawer-title" className="text-lg font-bold text-foreground">
            {fullName}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {activePoliciesCount} {activePoliciesCount === 1 ? 'activa' : 'activas'} de {totalPoliciesCount}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {companies.map((company) => (
            <span
              key={company}
              className="text-[11px] px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border/50"
            >
              {company}
            </span>
          ))}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        aria-label="Cerrar panel de detalle"
        className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
      >
        <span aria-hidden="true" className="text-lg">✕</span>
      </Button>
    </div>
  )
}
