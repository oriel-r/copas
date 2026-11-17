import { beforeEach, describe, expect, it } from 'vitest'
import { env } from 'cloudflare:workers'
import { getOrganizationWhatsAppEndpointResponseSchema } from '@copas/contracts'
import app from '../../../index'

const password = 'correct-horse-battery-staple'
let sequence = 0

function testEnvironment() {
  return {
    ...env,
    BETTER_AUTH_SECRET: 'integration-test-secret',
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-client-secret',
    MICROSOFT_CLIENT_ID: 'microsoft-client-id',
    MICROSOFT_CLIENT_SECRET: 'microsoft-client-secret',
    MICROSOFT_TENANT_ID: 'common',
    PLATFORM_WHATSAPP_ACCESS_TOKEN: 'EAAB_test_platform_token_integration',
    PLATFORM_WHATSAPP_PHONE_NUMBER_ID: '109876543210123',
    PLATFORM_WHATSAPP_WABA_ID: 'waba_test_456',
  }
}

async function apiRequest(path: string, init: RequestInit = {}) {
  sequence += 1
  const headers = new Headers(init.headers)
  if (!headers.has('x-forwarded-for')) {
    headers.set('x-forwarded-for', `10.0.0.${(sequence % 200) + 1}`)
  }
  if (!headers.has('cf-connecting-ip')) {
    headers.set('cf-connecting-ip', `10.0.0.${(sequence % 200) + 1}`)
  }
  return app.request(path, { ...init, headers }, testEnvironment())
}

async function createAuthenticatedAgency(agencyName = 'Agencia Integracion') {
  sequence += 1
  const tag = `${Date.now()}-${sequence}-${Math.random().toString(36).slice(2, 6)}`
  const signUpRes = await apiRequest('/auth/sign-up/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: `PAS User ${sequence}`,
      email: `channel.ep.${tag}@example.com`,
      password,
    }),
  })
  if (signUpRes.status !== 200) {
    throw new Error(`sign-up failed: ${signUpRes.status}`)
  }
  const cookie = signUpRes.headers.get('set-cookie') ?? ''

  const orgRes = await apiRequest('/auth/organization/create', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:5173',
      cookie,
    },
    body: JSON.stringify({ name: `${agencyName} ${sequence}` }),
  })
  if (orgRes.status !== 200) {
    throw new Error(`organization/create failed: ${orgRes.status}`)
  }
  const orgBody = (await orgRes.json()) as { id: string }

  const activeRes = await apiRequest('/auth/organization/set-active', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:5173',
      cookie,
    },
    body: JSON.stringify({ organizationId: orgBody.id }),
  })
  const finalCookie = activeRes.headers.get('set-cookie') ?? cookie

  return {
    organizationId: orgBody.id,
    cookie: finalCookie,
  }
}

describe('Channel Endpoints Integration (D1)', () => {
  beforeEach(async () => {
    await env.DB.prepare('DELETE FROM message_statuses').run()
    await env.DB.prepare('DELETE FROM messages').run()
    await env.DB.prepare('DELETE FROM conversation_entities').run()
    await env.DB.prepare('DELETE FROM conversations').run()
    await env.DB.prepare('DELETE FROM organization_channel_endpoints').run()
    await env.DB.prepare('DELETE FROM organization_channels').run()
    await env.DB.prepare('DELETE FROM channel_endpoints').run()
    await env.DB.prepare('DELETE FROM invitation').run()
    await env.DB.prepare('DELETE FROM member').run()
    await env.DB.prepare('DELETE FROM session').run()
    await env.DB.prepare('DELETE FROM account').run()
    await env.DB.prepare('DELETE FROM organization').run()
    await env.DB.prepare('DELETE FROM user').run()
  })

  it('GET /channel-endpoints/whatsapp returns { endpoint: null } before registration', async () => {
    const { cookie } = await createAuthenticatedAgency()

    const res = await apiRequest('/channel-endpoints/whatsapp', {
      headers: { cookie },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ endpoint: null })
    expect(getOrganizationWhatsAppEndpointResponseSchema.safeParse(body).success).toBe(true)
  })

  it('PUT /channel-endpoints/whatsapp persists channel_endpoints, organization_channels, and organization_channel_endpoints in D1 and GET returns it', async () => {
    const { organizationId, cookie } = await createAuthenticatedAgency()

    const putRes = await apiRequest('/channel-endpoints/whatsapp', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        cookie,
      },
      body: JSON.stringify({ number: '  +54 9 11 1234-5678  ' }),
    })

    expect(putRes.status).toBe(200)
    const putBody = (await putRes.json()) as {
      endpoint: {
        endpointId: string
        organizationChannelEndpointId: string | null
        organizationId: string
        number: string | null
        provider: string
        ownerKind: string
        status: string
        linkingStatus: string
      }
    }
    expect(getOrganizationWhatsAppEndpointResponseSchema.safeParse(putBody).success).toBe(true)
    expect(putBody.endpoint).toMatchObject({
      organizationId,
      number: '+54 9 11 1234-5678',
      provider: 'whatsapp_cloud',
      ownerKind: 'organization',
      status: 'inactive',
      linkingStatus: 'suspended',
    })
    expect(putBody.endpoint.endpointId).toBeTruthy()
    expect(putBody.endpoint.organizationChannelEndpointId).toBeTruthy()

    const epRow = await env.DB.prepare(
      'SELECT * FROM channel_endpoints WHERE id = ?',
    )
      .bind(putBody.endpoint.endpointId)
      .first<Record<string, unknown>>()
    expect(epRow).toBeTruthy()
    expect(epRow?.number).toBe('+54 9 11 1234-5678')
    expect(epRow?.ownerKind).toBe('organization')
    expect(epRow?.ownerOrganizationId).toBe(organizationId)
    expect(epRow?.status).toBe('inactive')

    const orgChannelRow = await env.DB.prepare(
      'SELECT * FROM organization_channels WHERE organizationId = ?',
    )
      .bind(organizationId)
      .first<Record<string, unknown>>()
    expect(orgChannelRow).toBeTruthy()
    expect(orgChannelRow?.isEnabled).toBe(0)

    const linkRow = await env.DB.prepare(
      'SELECT * FROM organization_channel_endpoints WHERE id = ?',
    )
      .bind(putBody.endpoint.organizationChannelEndpointId)
      .first<Record<string, unknown>>()
    expect(linkRow).toBeTruthy()
    expect(linkRow?.isPrimary).toBe(0)
    expect(linkRow?.status).toBe('suspended')

    const getRes = await apiRequest('/channel-endpoints/whatsapp', {
      headers: { cookie },
    })
    expect(getRes.status).toBe(200)
    const getBody = await getRes.json()
    expect(getBody).toEqual(putBody)
  })

  it('coexists without violating organization_channel_endpoints_active_uq when an active platform endpoint already exists for the same organization_channel', async () => {
    const { organizationId, cookie } = await createAuthenticatedAgency()

    await env.DB.prepare(
      `INSERT OR IGNORE INTO channels (id, created_at, updated_at, code, name, isSystem)
       VALUES ('chn_whatsapp', unixepoch() * 1000, unixepoch() * 1000, 'whatsapp', 'WhatsApp', 1)`,
    ).run()

    await env.DB.prepare(
      `INSERT INTO channel_endpoints (id, created_at, updated_at, channelId, number, provider, ownerKind, ownerOrganizationId, status)
       VALUES ('cep-platform-1', unixepoch() * 1000, unixepoch() * 1000, 'chn_whatsapp', '+54 9 11 0000-0000', 'whatsapp_cloud', 'platform', NULL, 'active')`,
    ).run()

    await env.DB.prepare(
      `INSERT INTO organization_channels (id, created_at, updated_at, organizationId, channelId, isEnabled)
       VALUES ('och-existing-1', unixepoch() * 1000, unixepoch() * 1000, ?, 'chn_whatsapp', 1)`,
    )
      .bind(organizationId)
      .run()

    await env.DB.prepare(
      `INSERT INTO organization_channel_endpoints (id, created_at, updated_at, organizationChannelId, endpointId, isPrimary, status)
       VALUES ('oce-platform-1', unixepoch() * 1000, unixepoch() * 1000, 'och-existing-1', 'cep-platform-1', 1, 'active')`,
    ).run()

    const putRes = await apiRequest('/channel-endpoints/whatsapp', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        cookie,
      },
      body: JSON.stringify({ number: '+54 9 11 5555-6666' }),
    })

    expect(putRes.status).toBe(200)
    const putBody = (await putRes.json()) as {
      endpoint: {
        endpointId: string
        organizationChannelEndpointId: string | null
        number: string | null
        status: string
        linkingStatus: string
      }
    }
    expect(putBody.endpoint.number).toBe('+54 9 11 5555-6666')
    expect(putBody.endpoint.status).toBe('inactive')
    expect(putBody.endpoint.linkingStatus).toBe('suspended')

    const platformLink = await env.DB.prepare(
      'SELECT status, isPrimary FROM organization_channel_endpoints WHERE id = ?',
    )
      .bind('oce-platform-1')
      .first<Record<string, unknown>>()
    expect(platformLink).toEqual({ status: 'active', isPrimary: 1 })
  })

  it('resets an "active" endpoint back to "inactive" / "suspended" when updated with a new number', async () => {
    const { cookie } = await createAuthenticatedAgency()

    const initialRes = await apiRequest('/channel-endpoints/whatsapp', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        cookie,
      },
      body: JSON.stringify({ number: '+54 9 11 1111-2222' }),
    })
    expect(initialRes.status).toBe(200)
    const initialBody = (await initialRes.json()) as {
      endpoint: { endpointId: string; organizationChannelEndpointId: string }
    }

    // Simulate admin linking completion activating the endpoint & link
    await env.DB.prepare('UPDATE channel_endpoints SET status = ? WHERE id = ?')
      .bind('active', initialBody.endpoint.endpointId)
      .run()
    await env.DB.prepare(
      'UPDATE organization_channel_endpoints SET status = ?, isPrimary = 1 WHERE id = ?',
    )
      .bind('active', initialBody.endpoint.organizationChannelEndpointId)
      .run()

    const updateRes = await apiRequest('/channel-endpoints/whatsapp', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        cookie,
      },
      body: JSON.stringify({ number: '+54 9 11 9999-8888' }),
    })

    expect(updateRes.status).toBe(200)
    const updateBody = (await updateRes.json()) as {
      endpoint: {
        endpointId: string
        number: string | null
        status: string
        linkingStatus: string
      }
    }
    expect(updateBody.endpoint.endpointId).toBe(initialBody.endpoint.endpointId)
    expect(updateBody.endpoint.number).toBe('+54 9 11 9999-8888')
    expect(updateBody.endpoint.status).toBe('inactive')
    expect(updateBody.endpoint.linkingStatus).toBe('suspended')

    const getRes = await apiRequest('/channel-endpoints/whatsapp', {
      headers: { cookie },
    })
    expect(getRes.status).toBe(200)
    const getBody = await getRes.json()
    expect(getBody).toEqual(updateBody)
  })
})
