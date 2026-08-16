import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, organization } from 'better-auth/plugins'

import { createDatabase } from '../../../platform/cloudflare/database'
import { requireEnvironmentValue } from '../../../platform/cloudflare/environment'
import { createKvSecondaryStorage } from '../../../platform/cloudflare/kv-secondary-storage'
import { authSchema } from '@copas/auth-db'

export function createAuth(env: CloudflareBindings) {
  const database = createDatabase(env.DB)
  const betterAuthSecret = requireEnvironmentValue(
    env.BETTER_AUTH_SECRET,
    'BETTER_AUTH_SECRET',
  )
  const googleClientId = requireEnvironmentValue(
    env.GOOGLE_CLIENT_ID,
    'GOOGLE_CLIENT_ID',
  )
  const googleClientSecret = requireEnvironmentValue(
    env.GOOGLE_CLIENT_SECRET,
    'GOOGLE_CLIENT_SECRET',
  )
  const microsoftClientId = requireEnvironmentValue(
    env.MICROSOFT_CLIENT_ID,
    'MICROSOFT_CLIENT_ID',
  )
  const microsoftClientSecret = requireEnvironmentValue(
    env.MICROSOFT_CLIENT_SECRET,
    'MICROSOFT_CLIENT_SECRET',
  )

  return betterAuth({
    appName: 'Copas',
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/auth',
    secret: betterAuthSecret,

    database: drizzleAdapter(database, {
      provider: 'sqlite',
      schema: authSchema,
    }),

    secondaryStorage: createKvSecondaryStorage(env.AUTH_KV),

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },

    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
      microsoft: {
        clientId: microsoftClientId,
        clientSecret: microsoftClientSecret,
        tenantId: env.MICROSOFT_TENANT_ID ?? 'common',
      },
    },

    plugins: [admin(), organization()],

    trustedOrigins: [env.CLIENT_URL],

    session: {
      storeSessionInDatabase: true,
    },

    verification: {
      storeInDatabase: true,
    },

    rateLimit: {
      enabled: true,
      storage: 'database',
    },

    advanced: {
      useSecureCookies: env.NODE_ENV !== 'development',
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
