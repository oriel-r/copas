import { createAuthClient } from 'better-auth/react'
import { authBaseUrl } from './backend'

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
})
