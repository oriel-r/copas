import type { ReactNode } from 'react'
import { DemoBanner } from './demo-banner'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="app-shell">
      <DemoBanner />
      {children}
    </main>
  )
}