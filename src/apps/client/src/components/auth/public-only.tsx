import { Navigate, Outlet } from 'react-router'
import { useSession } from '@/lib/session'
import { PageLoader } from '@copas/ui'

export function PublicOnly() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <PageLoader />
  }

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
