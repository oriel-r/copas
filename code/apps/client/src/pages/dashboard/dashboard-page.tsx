import { useState } from 'react'
import LogoutIcon from '~icons/material-symbols/logout'
import LoadingIcon from '~icons/material-symbols/progress-activity'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error. Intentá nuevamente.'
}

export function DashboardPage() {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignOut() {
    setIsSigningOut(true)
    setError(null)

    try {
      const result = await authClient.signOut()

      if (result.error) {
        setError(result.error.message ?? 'No se pudo cerrar sesión.')
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <main className="app-shell">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Hola!</CardTitle>
          <CardDescription>Tu sesión está activa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button className="w-full" variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? <LoadingIcon className="animate-spin" /> : <LogoutIcon />}
            {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
