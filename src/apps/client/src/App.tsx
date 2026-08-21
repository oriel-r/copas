import { Navigate, Route, Routes } from 'react-router'
import { lazy, Suspense } from 'react'
import { PublicOnly } from '@/components/auth/public-only'
import { RequireSession } from '@/components/auth/require-session'
import { PageLoader } from '@/components/ui/page-loader'

const LoginPage = lazy(() => import('@/pages/auth/login-page').then((m) => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })))
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
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>

        <Route path="/app" element={<Navigate to="/dashboard" replace />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default App
