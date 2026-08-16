import { useState } from 'react'
import GoogleIcon from '~icons/logos/google-icon'
import MicrosoftIcon from '~icons/logos/microsoft-icon'
import LoadingIcon from '~icons/material-symbols/progress-activity'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { authClient } from '@/lib/auth-client'

type OAuthProvider = 'google' | 'microsoft'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error. Intentá nuevamente.'
}

export function LoginPage() {
  const [activeProvider, setActiveProvider] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleOAuthSignIn(provider: OAuthProvider) {
    setActiveProvider(provider)
    setError(null)

    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: window.location.origin,
      })

      if (result.error) {
        setError(result.error.message ?? 'No se pudo iniciar sesión.')
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setActiveProvider(null)
    }
  }

  return (
    <main className="app-shell">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bienvenido</CardTitle>
          <CardDescription>Ingresá o creá tu cuenta usando un proveedor OAuth.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Tabs defaultValue="sign-in" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sign-in">Sign in</TabsTrigger>
              <TabsTrigger value="sign-up">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="sign-in">
              <OAuthButtons activeProvider={activeProvider} onSelect={handleOAuthSignIn} />
            </TabsContent>
            <TabsContent value="sign-up">
              <OAuthButtons activeProvider={activeProvider} onSelect={handleOAuthSignIn} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  )
}

type OAuthButtonsProps = {
  activeProvider: OAuthProvider | null
  onSelect: (provider: OAuthProvider) => Promise<void>
}

function OAuthButtons({ activeProvider, onSelect }: OAuthButtonsProps) {
  return (
    <div className="mt-4 grid gap-3">
      <Button
        variant="outline"
        className="w-full"
        onClick={() => onSelect('google')}
        disabled={activeProvider !== null}
      >
        {activeProvider === 'google' ? <LoadingIcon className="animate-spin" /> : <GoogleIcon />}
        Continuar con Google
      </Button>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => onSelect('microsoft')}
        disabled={activeProvider !== null}
      >
        {activeProvider === 'microsoft' ? <LoadingIcon className="animate-spin" /> : <MicrosoftIcon />}
        Continuar con Microsoft
      </Button>
    </div>
  )
}
