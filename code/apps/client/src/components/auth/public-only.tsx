import { Navigate, Outlet } from 'react-router'
import { authClient } from '@/lib/auth-client'
import { PageLoader } from '@/components/ui/page-loader'

export function PublicOnly() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return <PageLoader />
  }

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
