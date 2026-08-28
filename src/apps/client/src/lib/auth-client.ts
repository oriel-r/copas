import { createAuthClient } from 'better-auth/react'
import { adminClient, organizationClient } from 'better-auth/client/plugins'
import { authBaseUrl } from './backend'

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  sessionOptions: {
    refetchOnWindowFocus: false,
    refetchInterval: 300,
  },
  plugins: [adminClient(), organizationClient()],
})
