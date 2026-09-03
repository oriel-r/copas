import { hc } from 'hono/client'
import type { AppType } from '../../../api/src/core/setup/app.router'
import { backendUrl } from './backend'

const baseUrl = backendUrl('/')

export const apiClient = hc<AppType>(baseUrl, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      credentials: 'include',
    })
  },
})

export type ApiClient = typeof apiClient
