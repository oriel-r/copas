import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router'
import { Alert, AlertDescription, PageLoader } from '@copas/ui'
import { authClient } from '@/lib/auth-client'
import { AppShell } from '@/components/layout/app-shell'

export function RequireAgency() {
  const { data: organizations, isPending, error } = authClient.useListOrganizations()

  useEffect(() => {
    if (organizations && organizations.length > 0) {
      void authClient.organization.setActive({ organizationId: organizations[0].id })
    }
  }, [organizations])

  if (isPending) {
    return <PageLoader />
  }

  if (error) {
    return (
      <AppShell>
        <Alert className="max-w-md" variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </AppShell>
    )
  }

  if (!organizations || organizations.length === 0) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
