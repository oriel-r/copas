import { createAuth } from './config'

/**
 * Entry point exclusivo para el CLI de Better Auth (`pnpm auth:generate`).
 *
 * El CLI necesita una instancia exportada como `auth` (o default export) para
 * inferir el schema. Los valores de entorno son placeholders: el CLI solo lee
 * `auth.options` (plugins, providers, emailAndPassword, ...) para generar el
 * schema; nunca toca la base de datos real.
 */
export const auth = createAuth({
  database: undefined as never,
  secret: 'cli-placeholder-secret-for-schema-generation',
  baseURL: 'http://localhost:8787',
  googleClientId: 'cli-placeholder',
  googleClientSecret: 'cli-placeholder',
  microsoftClientId: 'cli-placeholder',
  microsoftClientSecret: 'cli-placeholder',
  microsoftTenantId: 'common',
})