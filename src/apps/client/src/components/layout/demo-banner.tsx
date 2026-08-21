import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { retryProbe, useSessionStore } from '@/lib/session'

export function DemoBanner() {
  const isDemoMode = useSessionStore((s) => s.status === 'offline')

  if (!isDemoMode) {
    return null
  }

  return (
    <Alert className="max-w-md">
      <AlertTitle>Modo demo</AlertTitle>
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>El backend no está disponible. Estás viendo datos de demostración.</span>
        <Button variant="outline" size="sm" onClick={retryProbe}>
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
  )
}