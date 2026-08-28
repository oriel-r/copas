import { Navigate, Route, Routes } from 'react-router'
import { lazy, Suspense } from 'react'
import { PublicOnly } from '@/components/auth/public-only'
import { RequireSession } from '@/components/auth/require-session'
import { RequireAgency } from '@/components/auth/require-agency'
import { PageLoader } from '@copas/ui'

const LoginPage = lazy(() => import('@/pages/auth/login-page').then((m) => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })))
const OnboardingPage = lazy(() => import('@/pages/onboarding/onboarding-page').then((m) => ({ default: m.OnboardingPage })))
const NotFoundPage = lazy(() => import('@/pages/not-found-page').then((m) => ({ default: m.NotFoundPage })))

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<PublicOnly />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<RequireSession />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<RequireAgency />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Route>

        <Route path="/app" element={<Navigate to="/dashboard" replace />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default App
