import LoadingIcon from '~icons/material-symbols/progress-activity'
import { Navigate, Outlet } from 'react-router'
import { authClient } from '@/lib/auth-client'

export function PublicOnly() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <main className="app-shell">
        <LoadingIcon className="size-6 animate-spin text-muted-foreground" aria-label="Cargando sesión" />
      </main>
    )
  }

  if (session) {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}
