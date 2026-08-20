import { backendUrl } from '@/lib/backend'
import { ApiError } from './api-error'

type HttpOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown
  headers?: Record<string, string>
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

async function request<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const { body, headers, signal, ...init } = options

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  }

  let requestBody: BodyInit | undefined

  if (body !== undefined) {
    if (isFormData(body)) {
      requestBody = body
    } else {
      requestHeaders['Content-Type'] = 'application/json'
      requestBody = JSON.stringify(body)
    }
  }

  const response = await fetch(backendUrl(path), {
    ...init,
    method: init.method ?? 'GET',
    credentials: 'include',
    headers: requestHeaders,
    body: requestBody,
    signal,
  })

  if (response.status === 204) {
    return undefined as T
  }

  if (!response.ok) {
    throw await ApiError.fromResponse(response)
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  return (await response.text()) as T
}

export const http = {
  get: <T>(path: string, options?: HttpOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: HttpOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: HttpOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: HttpOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: HttpOptions) => request<T>(path, { ...options, method: 'DELETE' }),
  request: <T>(path: string, options?: HttpOptions) => request<T>(path, options),
}
