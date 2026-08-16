const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/+$/, '')
const authPath = import.meta.env.VITE_AUTH_PATH ?? '/auth'

export function backendUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return backendBaseUrl ? `${backendBaseUrl}${normalizedPath}` : normalizedPath
}

export const authBaseUrl = backendUrl(authPath)
