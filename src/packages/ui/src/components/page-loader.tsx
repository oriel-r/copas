import LoadingIcon from '~icons/material-symbols/progress-activity'

interface PageLoaderProps {
  label?: string
}

export function PageLoader({ label = 'Cargando sesión' }: PageLoaderProps) {
  return (
    <main className="app-shell">
      <LoadingIcon className="size-6 animate-spin text-muted-foreground" aria-label={label} />
    </main>
  )
}