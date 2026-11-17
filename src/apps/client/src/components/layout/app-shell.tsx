import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { DemoBanner } from './demo-banner'
import { Navbar } from './navbar'
import { InsuredDetailDrawer } from '@/components/insured-detail/insured-detail-drawer'
import { AgencySettingsDrawer, AgencySettingsTrigger } from '@/components/settings'
import { authClient } from '@/lib/auth-client'
import { DEMO_ORGANIZATION, useSession, useSessionStore } from '@/lib/session'

interface AppShellProps {
  children: ReactNode
  showAgencySettings?: boolean
}

export function AppShell({ children, showAgencySettings }: AppShellProps) {
  const { pathname } = useLocation()
  const { data: session } = useSession()
  const isDemo = useSessionStore((s) => s.status === 'offline')
  const organizationsResult = authClient.useListOrganizations?.()
  const activeOrgResult = authClient.useActiveOrganization?.()

  const activeOrganization = isDemo
    ? DEMO_ORGANIZATION
    : (activeOrgResult?.data ?? organizationsResult?.data?.[0] ?? null)

  const canShowAgencySettings =
    showAgencySettings ??
    (Boolean(session) &&
      pathname !== '/onboarding' &&
      Boolean(activeOrganization))

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <DemoBanner />
      <Navbar />
      <main className="app-shell pb-8">
        {children}
      </main>
      <InsuredDetailDrawer />
      {canShowAgencySettings && (
        <>
          <AgencySettingsTrigger />
          <AgencySettingsDrawer
            organizationId={activeOrganization?.id ?? null}
            agencyName={activeOrganization?.name ?? null}
          />
        </>
      )}
    </div>
  )
}