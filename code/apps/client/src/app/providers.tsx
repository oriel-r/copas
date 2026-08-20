import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './query-client'
import { ErrorBoundary } from '@/components/ui/error-boundary'

type ProvidersProps = {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </QueryClientProvider>
  )
}
