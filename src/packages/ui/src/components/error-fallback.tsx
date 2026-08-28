import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <main className="app-shell">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Algo salió mal</CardTitle>
          <CardDescription>Ocurrió un error inesperado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="text-sm text-destructive p-4 bg-muted rounded overflow-auto">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
          <Button onClick={resetErrorBoundary} variant="outline" className="w-full">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}