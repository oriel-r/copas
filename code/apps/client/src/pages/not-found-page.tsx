import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppShell } from '@/components/layout/app-shell'

export function NotFoundPage() {
  return (
    <AppShell>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Página no encontrada</CardTitle>
          <CardDescription>La ruta que buscás no existe.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to="/app">Volver al inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  )
}
