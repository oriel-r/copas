import { betterAuth, type SecondaryStorage } from 'better-auth'
import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import { admin, organization } from 'better-auth/plugins'
import { uuidv7 } from 'uuidv7'

import { authSchema } from './auth-schema'

export interface AuthConfig {
  database: DrizzleDatabase
  secret: string
  baseURL: string
  googleClientId: string
  googleClientSecret: string
  microsoftClientId: string
  microsoftClientSecret: string
  microsoftTenantId?: string
  useSecureCookies?: boolean
  trustedOrigins?: string[]
  secondaryStorage?: SecondaryStorage
  rateLimitStorage?: 'database' | 'secondary-storage'
}

type DrizzleDatabase = Parameters<typeof drizzleAdapter>[0]

/**
 * Configuración canónica de Better Auth.
 *
 * Este archivo es la fuente de verdad para regenerar el schema de Drizzle de
 * auth vía `pnpm auth:generate` (los campos custom como `user.role`,
 * `user.banned`, etc. los aportan los plugins `admin()` y `organization()`).
 */
function baseConfig(config: AuthConfig) {
  return {
    appName: 'Copas',
    baseURL: config.baseURL,
    basePath: '/auth',
    secret: config.secret,

    database: drizzleAdapter(config.database, {
      provider: 'sqlite',
      schema: authSchema,
    }),

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },

    socialProviders: {
      google: {
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret,
      },
      microsoft: {
        clientId: config.microsoftClientId,
        clientSecret: config.microsoftClientSecret,
        tenantId: config.microsoftTenantId ?? 'common',
      },
    },

    plugins: [admin(), organization()],

    rateLimit: {
      enabled: true,
      storage: config.rateLimitStorage ?? 'database',
    },

    advanced: {
      useSecureCookies: config.useSecureCookies ?? false,
      database: {
        generateId: () => uuidv7(),
      },
    },
  }
}

/**
 * Crea una instancia de Better Auth con el binding real de D1 y el entorno.
 * Usada por la app en runtime.
 */
export function createAuth(config: AuthConfig) {
  return betterAuth({
    ...baseConfig(config),
    trustedOrigins: config.trustedOrigins,
    secondaryStorage: config.secondaryStorage,
  })
}
