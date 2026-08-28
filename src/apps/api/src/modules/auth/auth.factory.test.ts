import { describe, expect, it } from 'vitest'
import { createAuth } from './auth.factory'

function createEnvironment(overrides: Partial<CloudflareBindings> = {}) {
  return {
    DB: {} as D1Database,
    AUTH_KV: {} as KVNamespace,
    BETTER_AUTH_URL: 'http://localhost:8787',
    CLIENT_URL: 'http://localhost:5173',
    NODE_ENV: 'development',
    BETTER_AUTH_SECRET: 'test-secret',
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-client-secret',
    MICROSOFT_CLIENT_ID: 'microsoft-client-id',
    MICROSOFT_CLIENT_SECRET: 'microsoft-client-secret',
    MICROSOFT_TENANT_ID: 'common',
    ...overrides,
  } as CloudflareBindings
}

describe('createAuth', () => {
  it('creates Better Auth with the configured authentication options', () => {
    const auth = createAuth(createEnvironment())

    expect(auth.handler).toBeTypeOf('function')
    expect(auth.options.appName).toBe('Copas')
    expect(auth.options.baseURL).toBe('http://localhost:8787')
    expect(auth.options.basePath).toBe('/auth')
    expect(auth.options.emailAndPassword?.enabled).toBe(true)
    expect(auth.options.emailAndPassword?.minPasswordLength).toBe(8)
    expect(auth.options.socialProviders?.google).toEqual(
      expect.objectContaining({
        clientId: 'google-client-id',
        clientSecret: 'google-client-secret',
      }),
    )
    expect(auth.options.socialProviders?.microsoft).toEqual(
      expect.objectContaining({
        clientId: 'microsoft-client-id',
        clientSecret: 'microsoft-client-secret',
        tenantId: 'common',
      }),
    )
    expect(auth.options.plugins).toBeDefined()
    expect(auth.options.plugins?.some((p) => p.id === 'organization')).toBe(true)
    expect(auth.options.secondaryStorage).toBeDefined()
    expect(auth.options.rateLimit?.enabled).toBe(true)
    expect(auth.options.rateLimit?.storage).toBe('database')
    expect(auth.options.trustedOrigins).toEqual(['http://localhost:5173'])
    expect(auth.options.advanced?.useSecureCookies).toBe(false)
  })

  it('uses secure cookies outside development', () => {
    const auth = createAuth(createEnvironment({ NODE_ENV: 'staging' }))

    expect(auth.options.advanced?.useSecureCookies).toBe(true)
  })

  it('uses the common Microsoft tenant when it is not configured', () => {
    const auth = createAuth(
      createEnvironment({ MICROSOFT_TENANT_ID: undefined }),
    )

    expect(auth.options.socialProviders?.microsoft).toEqual(
      expect.objectContaining({ tenantId: 'common' }),
    )
  })
})

describe('createAuth required environment values', () => {
  const requiredValues = [
    ['BETTER_AUTH_SECRET', 'BETTER_AUTH_SECRET'],
    ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_ID'],
    ['GOOGLE_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET'],
    ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_ID'],
    ['MICROSOFT_CLIENT_SECRET', 'MICROSOFT_CLIENT_SECRET'],
  ] as const

  it.each(requiredValues)('rejects a missing %s value', (property, name) => {
    const environment = createEnvironment({ [property]: undefined })

    expect(() => createAuth(environment)).toThrow(
      `Missing required environment value: ${name}`,
    )
  })
})
