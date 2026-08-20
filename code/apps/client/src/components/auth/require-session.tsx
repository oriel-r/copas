import { Navigate, Outlet } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { authClient } from '@/lib/auth-client'
import { PageLoader } from '@/components/ui/page-loader'
import { AppShell } from '@/components/layout/app-shell'

export function RequireSession() {
  const { data: session, isPending, error } = authClient.useSession()

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
