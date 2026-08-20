import { useMutation } from '@tanstack/react-query'
import GoogleIcon from '~icons/logos/google-icon'
import MicrosoftIcon from '~icons/logos/microsoft-icon'
import LoadingIcon from '~icons/material-symbols/progress-activity'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'
import { getErrorMessage } from '@/lib/errors'
import { AppShell } from '@/components/layout/app-shell'
import { FormError } from '@/components/ui/form-error'

type OAuthProvider = 'google' | 'microsoft'

export function LoginPage() {
  const signInMutation = useMutation({
    mutationFn: async (provider: OAuthProvider) => {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: `${window.location.origin}/dashboard`,
      })
      if (result.error) {
        throw new Error(result.error.message ?? 'No se pudo iniciar sesión.')
      }
      return result
    },
    onError: () => {
      // Error handled by mutation state
    },
  })

  return (
    <AppShell>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bienvenido</CardTitle>
          <CardDescription>Ingresá o creá tu cuenta usando un proveedor OAuth.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormError message={signInMutation.error ? getErrorMessage(signInMutation.error) : null} className="mb-4" />
          <OAuthButtons
            isPending={signInMutation.isPending}
            onSignIn={(provider) => signInMutation.mutate(provider)}
          />
        </CardContent>
      </Card>
    </AppShell>
  )
}

type OAuthButtonsProps = {
  isPending: boolean
  onSignIn: (provider: OAuthProvider) => void
}

function OAuthButtons({ isPending, onSignIn }: OAuthButtonsProps) {
  return (
    <div className="mt-4 grid gap-3">
      <Button
        variant="outline"
        className="w-full"
        onClick={() => onSignIn('google')}
        disabled={isPending}
      >
        {isPending ? <LoadingIcon className="animate-spin" /> : <GoogleIcon />}
        Continuar con Google
      </Button>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => onSignIn('microsoft')}
        disabled={isPending}
      >
        {isPending ? <LoadingIcon className="animate-spin" /> : <MicrosoftIcon />}
        Continuar con Microsoft
      </Button>
    </div>
  )
}
