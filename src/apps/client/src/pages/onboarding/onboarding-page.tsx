import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, FormError } from '@copas/ui'
import { authClient } from '@/lib/auth-client'
import { AppShell } from '@/components/layout/app-shell'

export function OnboardingPage() {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || isPending) return

    setIsPending(true)
    setError(null)

    try {
      const res = await authClient.organization.create({
        name: trimmed,
        slug: trimmed,
      })

      if (res?.error) {
        setError(res.error.message ?? 'No se pudo crear la agencia.')
        setIsPending(false)
        return
      }

      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la agencia.')
      setIsPending(false)
    }
  }

  return (
    <AppShell>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configura tu agencia</CardTitle>
          <CardDescription>Para comenzar, ingresa los datos de tu agencia.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormError message={error} />
            <div className="space-y-2">
              <label htmlFor="agency-name" className="text-sm font-medium leading-none">
                ¿Cómo se llama tu agencia?
              </label>
              <input
                id="agency-name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Nombre de tu agencia"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending || !name.trim()}>
              {isPending ? 'Creando...' : 'Continuar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  )
}

