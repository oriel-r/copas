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
  const headers = new Headers(init.headers)
  if (!headers.has('x-forwarded-for')) {
    headers.set('x-forwarded-for', `192.168.1.${(userSequence % 200) + 1}`)
  }
  if (!headers.has('cf-connecting-ip')) {
    headers.set('cf-connecting-ip', `192.168.1.${(userSequence % 200) + 1}`)
  }
  return app.request(path, { ...init, headers }, testEnvironment())
}

async function signUp() {
  userSequence += 1
  const uniqueTag = `${Date.now()}-${userSequence}-${Math.random().toString(36).slice(2, 6)}`
  const email = `auth.integration.${uniqueTag}@example.com`
  const response = await request('/auth/sign-up/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: `Integration User ${userSequence}`,
      email,
      password,
    }),
  })
  const body = (await response.json()) as {
    user?: { id: string; email: string }
  }

  if (!body.user) {
    throw new Error(`signUp failed: ${response.status} - ${JSON.stringify(body)}`)
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

  it('creates an organization, assigns owner role, and generates a sanitized slug', async () => {
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
        slug: `Custom / Raw Slug ${userSequence}!`,
      }),
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      id: string
      name: string
      slug: string
      members: Array<{ role: string }>
    }
    expect(body.name).toBe('Integration Organization')
    expect(body.slug).toMatch(/^[a-z0-9-]+$/)
    expect(body.slug).toBe('integration-organization')
    expect(body.members[0]?.role).toBe('owner')
  })

  it('rejects creating a second organization for the same user (limit of 1 agency per user)', async () => {
    const registered = await signUp()

    // 1. Create first organization
    const firstResponse = await request('/auth/organization/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
        cookie: registered.cookie,
      },
      body: JSON.stringify({
        name: 'Primary Agency',
        slug: 'primary-agency',
      }),
    })
    expect(firstResponse.status).toBe(200)

    // 2. Attempt to create second organization with same user cookie
    const secondResponse = await request('/auth/organization/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
        cookie: registered.cookie,
      },
      body: JSON.stringify({
        name: 'Secondary Agency',
        slug: 'secondary-agency',
      }),
    })

    expect([400, 403]).toContain(secondResponse.status)
  })

  it('rejects organization creation for unauthenticated requests', async () => {
    const response = await request('/auth/organization/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
      },
      body: JSON.stringify({
        name: 'Unauthorized Agency',
      }),
    })

    expect([400, 401, 403]).toContain(response.status)
  })

  it('sanitizes agency names with special characters and accents into a clean slug', async () => {
    const registered = await signUp()

    const response = await request('/auth/organization/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
        cookie: registered.cookie,
      },
      body: JSON.stringify({
        name: '  Ágencia de Seguros Ñandú & Cía.  ',
      }),
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      name: string
      slug: string
    }
    expect(body.slug).toMatch(/^[a-z0-9-]+$/)
    expect(body.slug).not.toContain(' ')
    expect(body.slug).not.toContain('Á')
    expect(body.slug).not.toContain('Ñ')
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

  it('blocks sending invitations to users who already belong to another agency', async () => {
    // 1. User A creates Agency A
    const userA = await signUp()
    const agencyAResponse = await request('/auth/organization/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
        cookie: userA.cookie,
      },
      body: JSON.stringify({ name: 'Agency Alpha' }),
    })
    expect(agencyAResponse.status).toBe(200)
    const agencyA = (await agencyAResponse.json()) as { id: string }

    // 2. User B creates Agency B
    const userB = await signUp()
    const agencyBResponse = await request('/auth/organization/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
        cookie: userB.cookie,
      },
      body: JSON.stringify({ name: 'Agency Beta' }),
    })
    expect(agencyBResponse.status).toBe(200)

    // 3. User A attempts to invite User B to Agency A
    const inviteResponse = await request('/auth/organization/invite-member', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
        cookie: userA.cookie,
      },
      body: JSON.stringify({
        organizationId: agencyA.id,
        email: userB.user.email,
        role: 'member',
      }),
    })

    // Should be rejected because User B already belongs to Agency B
    expect([400, 403]).toContain(inviteResponse.status)
  })

  it('handles slug collisions when distinct users create agencies with identical names', async () => {
    // User 1 creates "La Segunda Seguros"
    const user1 = await signUp()
    const res1 = await request('/auth/organization/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
        cookie: user1.cookie,
      },
      body: JSON.stringify({ name: 'La Segunda Seguros' }),
    })
    expect(res1.status).toBe(200)
    const body1 = (await res1.json()) as { slug: string }
    expect(body1.slug).toBe('la-segunda-seguros')

    // User 2 creates another agency with the same name "La Segunda Seguros"
    const user2 = await signUp()
    const res2 = await request('/auth/organization/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
        cookie: user2.cookie,
      },
      body: JSON.stringify({ name: 'La Segunda Seguros' }),
    })

    // Either generates a unique slug (e.g. la-segunda-seguros-2) or responds with 200/unique identifier
    if (res2.status === 200) {
      const body2 = (await res2.json()) as { slug: string }
      expect(body2.slug).not.toBe(body1.slug)
    } else {
      expect([400, 409]).toContain(res2.status)
    }
  })
})

