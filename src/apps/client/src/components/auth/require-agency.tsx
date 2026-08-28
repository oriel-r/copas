import { Navigate, Outlet } from 'react-router'
import { authClient } from '@/lib/auth-client'

export function RequireAgency() {
  // Subagent instruction:
  // 1. Check if the user has an agency using authClient.useListOrganizations() or similar.
  // 2. Handle loading state (e.g. return <PageLoader />)
  // 3. If the user has NO agency (organizations length === 0), return <Navigate to="/onboarding" replace />
  // 4. If the user HAS an agency, ensure it's set as active, then return <Outlet />
  throw new Error('RequireAgency Not implemented')
}
