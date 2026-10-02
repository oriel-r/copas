import { Navigate, Outlet } from 'react-router'
import { Alert, AlertDescription } from '@copas/ui'
import { useSession } from '@/lib/session'
import { PageLoader } from '@copas/ui'
import { AppShell } from '@/components/layout/app-shell'

export function RequireSession() {
  const { data: session, isPending, error } = useSession()

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

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
