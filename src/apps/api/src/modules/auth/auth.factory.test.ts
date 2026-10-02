import { describe, expect, it, vi } from 'vitest'
import { createAuth } from './auth.factory'

function createEnvironment(overrides: Partial<CloudflareBindings> = {}) {
  return {
    DB: {} as D1Database,
    AUTH_KV: {} as KVNamespace,
    BETTER_AUTH_URL: 'http://localhost:8788',
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
    expect(auth.options.baseURL).toBe('http://localhost:8788')
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
    expect(auth.options.trustedOrigins).toEqual([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ])
    expect(auth.options.advanced?.useSecureCookies).toBe(false)
  })

  describe('secondaryStorage', () => {
    it('delegates get to AUTH_KV and returns serialized value or null', async () => {
      const mockAuthKv = {
        get: vi.fn().mockResolvedValueOnce('{"user":"123"}').mockResolvedValueOnce(null),
        put: vi.fn(),
        delete: vi.fn(),
      }
      const auth = createAuth(createEnvironment({ AUTH_KV: mockAuthKv as any }))
      const storage = auth.options.secondaryStorage!

      expect(storage).toBeDefined()
      const found = await storage.get('session-key')
      expect(found).toBe('{"user":"123"}')
      expect(mockAuthKv.get).toHaveBeenCalledWith('session-key')

      const missing = await storage.get('missing-key')
      expect(missing).toBeNull()
      expect(mockAuthKv.get).toHaveBeenCalledWith('missing-key')
    })

    it('delegates set to AUTH_KV with and without TTL', async () => {
      const mockAuthKv = {
        get: vi.fn(),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn(),
      }
      const auth = createAuth(createEnvironment({ AUTH_KV: mockAuthKv as any }))
      const storage = auth.options.secondaryStorage!

      await storage.set('session-key', 'session-data')
      expect(mockAuthKv.put).toHaveBeenCalledWith('session-key', 'session-data')

      await storage.set('session-key-ttl', 'session-data', 3600)
      expect(mockAuthKv.put).toHaveBeenCalledWith('session-key-ttl', 'session-data', { expirationTtl: 3600 })

      await storage.set('session-key-low-ttl', 'session-data', 15)
      expect(mockAuthKv.put).toHaveBeenCalledWith('session-key-low-ttl', 'session-data', { expirationTtl: 60 })
    })

    it('delegates delete to AUTH_KV', async () => {
      const mockAuthKv = {
        get: vi.fn(),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      }
      const auth = createAuth(createEnvironment({ AUTH_KV: mockAuthKv as any }))
      const storage = auth.options.secondaryStorage!

      await storage.delete('session-key')
      expect(mockAuthKv.delete).toHaveBeenCalledWith('session-key')
    })
  })

  it('configures production environment with secure cookies and restricted origins', () => {
    const auth = createAuth(
      createEnvironment({
        NODE_ENV: 'production',
        CLIENT_URL: 'https://copas.app',
      }),
    )

    expect(auth.options.advanced?.useSecureCookies).toBe(true)
    expect(auth.options.trustedOrigins).toEqual(['https://copas.app'])
  })

  it('restricts trusted origins to CLIENT_URL outside development', () => {
    const auth = createAuth(
      createEnvironment({
        NODE_ENV: 'staging',
        CLIENT_URL: 'https://client-staging.orielromero-work.workers.dev',
      }),
    )

    expect(auth.options.trustedOrigins).toEqual([
      'https://client-staging.orielromero-work.workers.dev',
    ])
  })

  it('normalizes trailing slash in CLIENT_URL for trusted origins in production and staging', () => {
    const authWithSlash = createAuth(
      createEnvironment({
        NODE_ENV: 'production',
        CLIENT_URL: 'https://copas.app/' as any,
      }),
    )
    expect(authWithSlash.options.trustedOrigins).toEqual(['https://copas.app'])

    const authStagingSlash = createAuth(
      createEnvironment({
        NODE_ENV: 'staging',
        CLIENT_URL: 'https://client-staging.orielromero-work.workers.dev/' as any,
      }),
    )
    expect(authStagingSlash.options.trustedOrigins).toEqual([
      'https://client-staging.orielromero-work.workers.dev',
    ])
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
