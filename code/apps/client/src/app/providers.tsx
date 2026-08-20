import { useEffect, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './query-client'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { RealSessionSync, useSessionStore } from '@/lib/session'

type ProvidersProps = {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const status = useSessionStore((s) => s.status)
  const probe = useSessionStore((s) => s.probe)

  useEffect(() => {
    void probe()
  }, [probe])

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        {status === 'online' ? <RealSessionSync /> : null}
        {children}
      </ErrorBoundary>
    </QueryClientProvider>
  )
}
