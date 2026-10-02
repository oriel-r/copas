import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

const mocks = vi.hoisted(() => ({
  createAuth: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock('../../modules/auth/auth.factory', () => ({
  createAuth: mocks.createAuth,
}))

import { sessionMiddleware } from './session'

describe('sessionMiddleware', () => {
  const setupApp = () => {
    const app = new Hono<{
      Variables: {
        organizationId?: string | null
        user?: any
        session?: any
      }
    }>()
    app.use('*', sessionMiddleware)

    app.get('/', (c) => c.json({ ok: true }))
    app.get('/auth/login', (c) => c.json({ ok: true }))
    app.get('/api/test', (c) => {
      return c.json({
        organizationId: c.get('organizationId'),
        user: c.get('user'),
        session: c.get('session'),
      })
    })

    return app
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createAuth.mockReturnValue({
      api: {
        getSession: mocks.getSession,
      },
    })
  })

  it('bypasses session lookup immediately for /auth/login and /', async () => {
    const app = setupApp()

    const resRoot = await app.request('/')
    expect(resRoot.status).toBe(200)

    const resLogin = await app.request('/auth/login')
    expect(resLogin.status).toBe(200)

    expect(mocks.getSession).not.toHaveBeenCalled()
  })

  it('populates organizationId, user and session on protected route when session exists', async () => {
    const mockSession = {
      session: { activeOrganizationId: 'org-123', userId: 'usr-456' },
      user: { id: 'usr-456', email: 'user@example.com' },
    }
    mocks.getSession.mockResolvedValueOnce(mockSession)

    const app = setupApp()
    const res = await app.request('/api/test')

    expect(res.status).toBe(200)
    const data = (await res.json()) as any
    expect(data.organizationId).toBe('org-123')
    expect(data.user.id).toBe('usr-456')
    expect(data.session).toEqual(mockSession)
    expect(mocks.getSession).toHaveBeenCalled()
  })

  it('handles null session correctly with null session values', async () => {
    mocks.getSession.mockResolvedValueOnce(null)

    const app = setupApp()
    const res = await app.request('/api/test')

    expect(res.status).toBe(200)
    const data = (await res.json()) as any
    expect(data.organizationId).toBeNull()
    expect(data.user).toBeNull()
    expect(data.session).toBeNull()
    expect(mocks.getSession).toHaveBeenCalled()
  })

  it('catches getSession error and continues to next handler', async () => {
    mocks.getSession.mockRejectedValueOnce(
      new Error('Session service unavailable'),
    )

    const app = setupApp()
    const res = await app.request('/api/test')

    expect(res.status).toBe(200)
    const data = (await res.json()) as any
    expect(data.organizationId).toBeNull()
    expect(data.user).toBeNull()
    expect(data.session).toBeNull()
    expect(mocks.getSession).toHaveBeenCalled()
  })
})
