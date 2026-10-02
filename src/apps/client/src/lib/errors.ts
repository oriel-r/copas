export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error. Intentá nuevamente.'
}