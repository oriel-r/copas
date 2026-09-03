import { createAuth as createConfiguredAuth, type AuthConfig } from '@copas/auth'

import { createDatabase } from '../../../platform/cloudflare/database'
import { requireEnvironmentValue } from '../../../platform/cloudflare/environment'
import { createKvSecondaryStorage } from '../../../platform/cloudflare/kv-secondary-storage'

export function createAuth(env: any) {
  const config: AuthConfig = {
    database: createDatabase(env.DB),
    secret: requireEnvironmentValue(env.BETTER_AUTH_SECRET, 'BETTER_AUTH_SECRET'),
    baseURL: env.BETTER_AUTH_URL,
    googleClientId: requireEnvironmentValue(env.GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID'),
    googleClientSecret: requireEnvironmentValue(
      env.GOOGLE_CLIENT_SECRET,
      'GOOGLE_CLIENT_SECRET',
    ),
    microsoftClientId: requireEnvironmentValue(
      env.MICROSOFT_CLIENT_ID,
      'MICROSOFT_CLIENT_ID',
    ),
    microsoftClientSecret: requireEnvironmentValue(
      env.MICROSOFT_CLIENT_SECRET,
      'MICROSOFT_CLIENT_SECRET',
    ),
    microsoftTenantId: env.MICROSOFT_TENANT_ID ?? 'common',
    useSecureCookies: env.NODE_ENV !== 'development',
    trustedOrigins:
      env.NODE_ENV === 'development'
        ? Array.from(
            new Set([
              env.CLIENT_URL,
              'http://localhost:5173',
              'http://127.0.0.1:5173',
              'http://localhost:5174',
              'http://127.0.0.1:5174',
            ].filter(Boolean)),
          )
        : [env.CLIENT_URL],
    secondaryStorage: createKvSecondaryStorage(env.AUTH_KV),
  }

  return createConfiguredAuth(config)
}

export type Auth = ReturnType<typeof createAuth>
