import { useMutation } from '@tanstack/react-query'
import GoogleIcon from '~icons/logos/google-icon'
import MicrosoftIcon from '~icons/logos/microsoft-icon'
import LoadingIcon from '~icons/material-symbols/progress-activity'
import { Button } from '@copas/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@copas/ui'
import { signInSocial, type OAuthProvider } from '@/lib/session'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@copas/ui'
import { FormError } from '@copas/ui'

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const signInMutation = useMutation({
    mutationFn: async (provider: OAuthProvider) => {
      const result = await signInSocial(provider, `${window.location.origin}/dashboard`)
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
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Bienvenido</CardTitle>
          <CardDescription>Ingresá o creá tu cuenta usando un proveedor OAuth.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <FormError message={signInMutation.error ? getErrorMessage(signInMutation.error) : null} />
          <OAuthButtons
            isPending={signInMutation.isPending}
            onSignIn={(provider) => signInMutation.mutate(provider)}
          />
        </CardContent>
      </Card>
      <p className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        Al continuar aceptás nuestros <a href="#">Términos de Servicio</a> y la{' '}
        <a href="#">Política de Privacidad</a>.
      </p>
    </div>
  )
}

type OAuthButtonsProps = {
  isPending: boolean
  onSignIn: (provider: OAuthProvider) => void
}

function OAuthButtons({ isPending, onSignIn }: OAuthButtonsProps) {
  return (
    <div className="flex flex-col gap-4">
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