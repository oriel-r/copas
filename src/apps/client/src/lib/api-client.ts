import { hc } from 'hono/client'
import type { AppType } from '../../../api/src/core/setup/app.router'
import { backendUrl } from './backend'

const origin =
  typeof window !== 'undefined' && window.location?.origin && !window.location.origin.startsWith('null') && window.location.origin !== 'about:blank'
    ? window.location.origin
    : 'http://localhost:5173'

const baseUrl = backendUrl('') !== '/'
  ? backendUrl('/')
  : `${origin}/api`

export const apiClient = hc<AppType>(baseUrl, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      credentials: 'include',
    })
  },
})

export type ApiClient = typeof apiClient
