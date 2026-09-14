const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/+$/, '')
const authPath = import.meta.env.VITE_AUTH_PATH ?? '/auth'

export function backendUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return backendBaseUrl ? `${backendBaseUrl}${normalizedPath}` : normalizedPath
}

export const authBaseUrl = backendBaseUrl
  ? `${backendBaseUrl}${authPath.startsWith('/') ? authPath : `/${authPath}`}`
  : typeof window !== 'undefined' && window.location?.origin && !window.location.origin.startsWith('null') && window.location.origin !== 'about:blank'
    ? `${window.location.origin}${authPath.startsWith('/') ? authPath : `/${authPath}`}`
    : `http://localhost:3000${authPath.startsWith('/') ? authPath : `/${authPath}`}`


export async function probeBackend(timeoutMs = 2000): Promise<boolean> {
  try {
    await fetch(backendUrl('/'), {
      method: 'GET',
      mode: 'no-cors',
      signal: AbortSignal.timeout(timeoutMs),
    })

    return true
  } catch {
    return false
  }
}
