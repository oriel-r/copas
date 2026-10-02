import { betterAuth, APIError, type SecondaryStorage } from 'better-auth'
import { createAuthMiddleware } from 'better-auth/api'
import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import { admin, organization, openAPI } from 'better-auth/plugins'
import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { authSchema } from './auth-schema'
import { member, organization as organizationTable, user } from './schema'
import { sanitizeSlug } from './slug'

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

const wrapMiddleware =
  typeof createAuthMiddleware === 'function' ? createAuthMiddleware : (fn: any) => fn

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

    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google', 'microsoft', 'email-password'],
      },
      // Estrategia 1.7: provider-id genera issuer determinístico `local:oauth:<providerId>` (ej: google -> local:oauth:google)
      // Evita el compatibility mode que dejaba issuer vacío y disparaba NOT NULL en D1
      identityStrategy: 'provider-id' as const,
    },

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

    plugins: [
      admin(),
      organization({
        allowUserToCreateOrganization: true,
        organizationLimit: 1,
        creatorRole: 'owner',
      }),
      openAPI()
    ],

    hooks: {
      before: wrapMiddleware(async (ctx: any) => {
        if (ctx.path.endsWith('/organization/create')) {
          const session = (ctx.context as any)?.session ?? (ctx as any)?.session
          const userId = session?.user?.id ?? session?.userId
          if (userId) {
            const userMembers = await (config.database as any)
              .select()
              .from(member)
              .where(eq(member.userId, userId))
            if (userMembers.length > 0) {
              throw new APIError('BAD_REQUEST', {
                message: 'El usuario ya pertenece a una organización',
              })
            }
          }

          const body = ctx.body as Record<string, any> | undefined
          if (body) {
            const name = (body.name as string) || ''
            const rawSlug = (body.slug as string) || name
            let baseSlug = sanitizeSlug(name || rawSlug || 'agency')
            if (!baseSlug) {
              baseSlug = 'agency'
            }

            let finalSlug = baseSlug
            let counter = 1
            while (true) {
              const existing = await (config.database as any)
                .select()
                .from(organizationTable)
                .where(eq(organizationTable.slug, finalSlug))
              if (existing.length === 0) {
                break
              }
              finalSlug = `${baseSlug}-${counter}`
              counter++
            }

            body.slug = finalSlug
            if (body.name) {
              body.name = body.name.trim()
            }
          }
        }

        if (
          ctx.path.endsWith('/organization/send-invitation') ||
          ctx.path.endsWith('/organization/create-invitation') ||
          ctx.path.endsWith('/organization/invite-member') ||
          ctx.path.endsWith('/invitation/create')
        ) {
          const body = ctx.body as Record<string, any> | undefined
          const invitedEmail = body?.email as string | undefined
          if (invitedEmail) {
            const users = await (config.database as any)
              .select()
              .from(user)
              .where(eq(user.email, invitedEmail.toLowerCase().trim()))
            if (users.length > 0) {
              const existingUserId = users[0].id
              const userMembers = await (config.database as any)
                .select()
                .from(member)
                .where(eq(member.userId, existingUserId))
              if (userMembers.length > 0) {
                throw new APIError('BAD_REQUEST', {
                  message: 'El usuario ya pertenece a una organización',
                })
              }
            }
          }
        }
      }),
    },

    databaseHooks: {
      user: {
        create: {
          before: async (user: any, _ctx: any) => {
            // Whitelist Admin Portal: pendiente de implementar.
            // Comportamiento actual: permitir todo registro (email+password y OAuth Google/Microsoft)
            // para no bloquear login social. El throw anterior causaba internal_server_error en /auth/callback/google
            // al intentar crear el user y dejar issuer/account sin popular.
            // TODO futuro: validar ctx.path / ctx.request url para bloquear sign-up público no admin
            return { data: user }
          },
        },
      },
      organization: {
        create: {
          before: async (org: any) => {
            let baseSlug = sanitizeSlug(org.name || org.slug || 'agency')
            if (!baseSlug) {
              baseSlug = 'agency'
            }
            let finalSlug = baseSlug
            let counter = 1
            while (true) {
              const existing = await (config.database as any)
                .select()
                .from(organizationTable)
                .where(eq(organizationTable.slug, finalSlug))
              if (existing.length === 0 || (existing.length === 1 && existing[0].id === org.id)) {
                break
              }
              finalSlug = `${baseSlug}-${counter}`
              counter++
            }
            return {
              data: {
                ...org,
                slug: finalSlug,
              },
            }
          },
        },
      },
      invitation: {
        create: {
          before: async (inv: any) => {
            if (inv.email) {
              const users = await (config.database as any)
                .select()
                .from(user)
                .where(eq(user.email, inv.email.toLowerCase().trim()))
              if (users.length > 0) {
                const existingUserId = users[0].id
                const userMembers = await (config.database as any)
                  .select()
                  .from(member)
                  .where(eq(member.userId, existingUserId))
                if (userMembers.length > 0) {
                  throw new APIError('BAD_REQUEST', {
                    message: 'El usuario ya pertenece a una organización',
                  })
                }
              }
            }
          },
        },
      },
      member: {
        create: {
          before: async (mem: any) => {
            if (mem.userId) {
              const userMembers = await (config.database as any)
                .select()
                .from(member)
                .where(eq(member.userId, mem.userId))
              if (userMembers.length > 0) {
                throw new APIError('BAD_REQUEST', {
                  message: 'El usuario ya pertenece a una organización',
                })
              }
            }
          },
        },
      },
    },

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
