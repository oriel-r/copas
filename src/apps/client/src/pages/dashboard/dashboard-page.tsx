import { useMutation } from '@tanstack/react-query'
import LogoutIcon from '~icons/material-symbols/logout'
import LoadingIcon from '~icons/material-symbols/progress-activity'
import { Button } from '@copas/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@copas/ui'
import { signOut } from '@/lib/session'
import { getErrorMessage } from '@/lib/errors'
import { AppShell } from '@/components/layout/app-shell'
import { FormError } from '@copas/ui'

export function DashboardPage() {
  const signOutMutation = useMutation({
    mutationFn: () => signOut(),
    onError: () => {
      // Error handled by mutation state
    },
  })

  return (
    <AppShell>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Hola!</CardTitle>
          <CardDescription>Tu sesión está activa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormError message={signOutMutation.error ? getErrorMessage(signOutMutation.error) : null} />
          <Button
            className="w-full"
            variant="outline"
            onClick={() => signOutMutation.mutate()}
            disabled={signOutMutation.isPending}
          >
            {signOutMutation.isPending ? <LoadingIcon className="animate-spin" /> : <LogoutIcon />}
            {signOutMutation.isPending ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  )
}
