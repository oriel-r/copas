import type { ReactNode } from 'react'
import { DemoBanner } from './demo-banner'
import { Navbar } from './navbar'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <DemoBanner />
      <Navbar />
      <main className="app-shell pb-8">
        {children}
      </main>
    </div>
  )
}