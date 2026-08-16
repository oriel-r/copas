import { Navigate, Route, Routes } from 'react-router'
import { PublicOnly } from '@/components/auth/public-only'
import { RequireSession } from '@/components/auth/require-session'
import { LoginPage } from '@/pages/auth/login-page'
import { DashboardPage } from '@/pages/dashboard/dashboard-page'
import { NotFoundPage } from '@/pages/not-found-page'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />

      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<RequireSession />}>
        <Route path="/app" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
