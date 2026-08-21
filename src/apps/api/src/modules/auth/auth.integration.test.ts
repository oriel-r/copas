import { describe, expect, it } from 'vitest'
import { env } from 'cloudflare:workers'
import app from '../../index'

const password = 'correct-horse-battery-staple'
let userSequence = 0

function testEnvironment() {
  return {
    ...env,
    BETTER_AUTH_SECRET: 'integration-test-secret',
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-client-secret',
    MICROSOFT_CLIENT_ID: 'microsoft-client-id',
    MICROSOFT_CLIENT_SECRET: 'microsoft-client-secret',
    MICROSOFT_TENANT_ID: 'common',
  }
}

async function request(
  path: string,
  init: RequestInit = {},
) {
  return app.request(path, init, testEnvironment())
}

async function signUp() {
  userSequence += 1
  const response = await request('/auth/sign-up/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: `Integration User ${userSequence}`,
      email: `auth.integration.${userSequence}@example.com`,
      password,
    }),
  })
  const body = (await response.json()) as {
    user: { id: string; email: string }
  }

  return {
    response,
    cookie: response.headers.get('set-cookie') ?? '',
    user: body.user,
  }
}

describe('Better Auth integration', () => {
  it('registers and signs in with email and password', async () => {
    const registered = await signUp()

    expect(registered.response.status).toBe(200)
    expect(registered.cookie).toContain('better-auth')

    const session = await request('/auth/get-session', {
      headers: { cookie: registered.cookie },
    })

    expect(session.status).toBe(200)
    const sessionBody = (await session.json()) as {
      user: { email: string }
    }
    expect(sessionBody.user.email).toBe(registered.user.email)
  })

  it('exposes the configured social login providers', async () => {
    const response = await request('/auth/sign-in/social', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        callbackURL: 'http://localhost:5173',
      }),
    })

    expect(response.status).not.toBe(404)
    expect(response.status).not.toBe(405)
  })

  it('creates an organization and assigns the owner role', async () => {
    const registered = await signUp()

    const response = await request('/auth/organization/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
        cookie: registered.cookie,
      },
      body: JSON.stringify({
        name: 'Integration Organization',
        slug: `integration-organization-${userSequence}`,
      }),
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      name: string
      members: Array<{ role: string }>
    }
    expect(body.name).toBe('Integration Organization')
    expect(body.members[0]?.role).toBe('owner')
  })

  it('allows an administrator to update a user role', async () => {
    const registered = await signUp()
    const database = testEnvironment().DB

    await database
      .prepare('UPDATE user SET role = ? WHERE id = ?')
      .bind('admin', registered.user.id)
      .run()

    const signedIn = await request('/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: registered.user.email,
        password,
      }),
    })

    const response = await request('/auth/admin/set-role', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
        cookie: signedIn.headers.get('set-cookie') ?? '',
      },
      body: JSON.stringify({
        userId: registered.user.id,
        role: 'user',
      }),
    })

    expect(response.status).toBe(200)
  })
})
