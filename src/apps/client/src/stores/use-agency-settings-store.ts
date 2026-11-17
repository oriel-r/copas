import { create } from 'zustand'

export interface AgencyPhoneSaveContext {
  organizationId?: string | null
  agencyName?: string | null
}

export interface AgencySettingsState {
  isOpen: boolean
  agencyPhone: string | null
  open: () => void
  close: () => void
  toggle: () => void
  saveAgencyPhone: (phone: string, context?: AgencyPhoneSaveContext) => void
  reset: () => void
}

/**
 * Store en memoria para los ajustes de la agencia (Fase 1 - sin persistencia).
 */
export const useAgencySettingsStore = create<AgencySettingsState>((set) => ({
  isOpen: false,
  agencyPhone: null,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  saveAgencyPhone: (phone, context) => {
    const trimmed = phone.trim()
    console.log('[AgencySettings] Teléfono de agencia guardado (en memoria):', {
      organizationId: context?.organizationId ?? null,
      agencyName: context?.agencyName ?? null,
      phone: trimmed,
    })
    set({ agencyPhone: trimmed })
  },
  reset: () => set({ isOpen: false, agencyPhone: null }),
}))
