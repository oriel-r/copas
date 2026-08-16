import LoadingIcon from '~icons/material-symbols/progress-activity'
import { Navigate, Outlet } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { authClient } from '@/lib/auth-client'

export function RequireSession() {
  const { data: session, isPending, error } = authClient.useSession()

  if (isPending) {
    return (
      <main className="app-shell">
        <LoadingIcon className="size-6 animate-spin text-muted-foreground" aria-label="Cargando sesión" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="app-shell">
        <Alert className="max-w-md" variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
