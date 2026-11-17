import React from 'react'
import { Button } from '@copas/ui'
import SettingsIcon from '~icons/material-symbols/settings'
import { useAgencySettingsStore } from '@/stores/use-agency-settings-store'

export const AGENCY_SETTINGS_DRAWER_ID = 'agency-settings-drawer'

export interface AgencySettingsTriggerProps {
  isOpen?: boolean
  onOpen?: () => void
}

export const AgencySettingsTrigger: React.FC<AgencySettingsTriggerProps> = ({
  isOpen: propIsOpen,
  onOpen: propOnOpen,
}) => {
  const storeIsOpen = useAgencySettingsStore((s) => s.isOpen)
  const storeOpen = useAgencySettingsStore((s) => s.open)

  const isOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen
  const handleOpen = propOnOpen ?? storeOpen

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleOpen}
        aria-label="Abrir ajustes de la agencia"
        aria-expanded={isOpen}
        aria-controls={AGENCY_SETTINGS_DRAWER_ID}
        title="Ajustes de la agencia"
        className="h-11 w-11 rounded-full border-border bg-card/95 backdrop-blur-xs text-muted-foreground hover:text-foreground shadow-lg cursor-pointer"
      >
        <SettingsIcon className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  )
}
