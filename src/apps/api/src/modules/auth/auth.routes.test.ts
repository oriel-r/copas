import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAuth: vi.fn(),
  handler: vi.fn(),
}))

vi.mock('./auth.factory', () => ({
  createAuth: mocks.createAuth,
}))

import { authRoutes } from './auth.routes'

describe('authRoutes', () => {
  beforeEach(() => {
    mocks.handler.mockResolvedValue(new Response('handled'))
    mocks.createAuth.mockReturnValue({ handler: mocks.handler })
  })

  it('creates an auth instance from the request bindings', async () => {
    const environment = { CLIENT_URL: 'http://localhost:5173' }
    const request = new Request('http://localhost/auth/get-session')

    const response = await authRoutes.fetch(request, environment as never)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('handled')
    expect(mocks.createAuth).toHaveBeenCalledWith(environment)
    expect(mocks.handler).toHaveBeenCalledWith(request)
  })

  it('delegates POST requests to Better Auth', async () => {
    const request = new Request('http://localhost/auth/sign-in/email', {
      method: 'POST',
      body: '{}',
    })

    const response = await authRoutes.fetch(request, {} as never)

    expect(response.status).toBe(200)
    expect(mocks.handler).toHaveBeenCalledWith(request)
  })
})
