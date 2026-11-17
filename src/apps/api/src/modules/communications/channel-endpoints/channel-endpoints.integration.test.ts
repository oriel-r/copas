import { beforeEach, describe, expect, it } from 'vitest'
import { env } from 'cloudflare:workers'
import { getOrganizationWhatsAppEndpointResponseSchema } from '@copas/contracts'
import app from '../../../index'

const password = 'correct-horse-battery-staple'
const statusWebhookSecret = 'integration-whatsapp-status-secret'
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
    WHATSAPP_STATUS_WEBHOOK_SECRET: statusWebhookSecret,
  }
}

async function signStatusWebhook(rawBody: string, secret = statusWebhookSecret): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody))
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `sha256=${hex}`
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
    await env.DB.prepare('DELETE FROM organization_integrations').run()
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

  it('POST /webhooks/whatsapp-channel-status with signed "connected" activates org endpoint, coexists with active platform endpoint, enables channel, upserts integration phoneNumberId, and updates GET /channel-endpoints/whatsapp', async () => {
    const { organizationId, cookie } = await createAuthenticatedAgency()

    await env.DB.prepare(
      `INSERT OR IGNORE INTO channels (id, created_at, updated_at, code, name, isSystem)
       VALUES ('chn_whatsapp', unixepoch() * 1000, unixepoch() * 1000, 'whatsapp', 'WhatsApp', 1)`,
    ).run()

    await env.DB.prepare(
      `INSERT INTO channel_endpoints (id, created_at, updated_at, channelId, number, provider, ownerKind, ownerOrganizationId, status)
       VALUES ('cep-platform-sync', unixepoch() * 1000, unixepoch() * 1000, 'chn_whatsapp', '+54 9 11 0000-0000', 'whatsapp_cloud', 'platform', NULL, 'active')`,
    ).run()

    await env.DB.prepare(
      `INSERT INTO organization_channels (id, created_at, updated_at, organizationId, channelId, isEnabled)
       VALUES ('och-sync-1', unixepoch() * 1000, unixepoch() * 1000, ?, 'chn_whatsapp', 1)`,
    )
      .bind(organizationId)
      .run()

    await env.DB.prepare(
      `INSERT INTO organization_channel_endpoints (id, created_at, updated_at, organizationChannelId, endpointId, isPrimary, status)
       VALUES ('oce-platform-sync', unixepoch() * 1000, unixepoch() * 1000, 'och-sync-1', 'cep-platform-sync', 1, 'active')`,
    ).run()

    const putRes = await apiRequest('/channel-endpoints/whatsapp', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ number: '+54 9 11 4444-5555' }),
    })
    expect(putRes.status).toBe(200)
    const putBody = (await putRes.json()) as {
      endpoint: { endpointId: string; organizationChannelEndpointId: string }
    }

    const webhookBody = JSON.stringify({
      phoneNumber: '541144445555', // Argentine 54... candidate matching +54 9 11 4444-5555
      phoneNumberId: 'waha-phone-sync-1',
      status: 'connected',
      timestamp: 1794885805,
    })
    const signature = await signStatusWebhook(webhookBody)

    const webhookRes = await apiRequest('/webhooks/whatsapp-channel-status', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
      },
      body: webhookBody,
    })

    expect(webhookRes.status).toBe(200)
    const webhookJson = (await webhookRes.json()) as {
      ok: boolean
      endpoint: Record<string, unknown>
    }
    expect(webhookJson.ok).toBe(true)
    expect(webhookJson.endpoint).toMatchObject({
      endpointId: putBody.endpoint.endpointId,
      organizationChannelEndpointId: putBody.endpoint.organizationChannelEndpointId,
      organizationId,
      number: '+54 9 11 4444-5555',
      status: 'active',
      linkingStatus: 'active',
      connectionStatus: 'connected',
    })

    const platformLink = await env.DB.prepare(
      'SELECT status, isPrimary FROM organization_channel_endpoints WHERE id = ?',
    )
      .bind('oce-platform-sync')
      .first<Record<string, unknown>>()
    expect(platformLink).toEqual({ status: 'suspended', isPrimary: 0 })

    const orgChannelRow = await env.DB.prepare(
      'SELECT isEnabled FROM organization_channels WHERE id = ?',
    )
      .bind('och-sync-1')
      .first<Record<string, unknown>>()
    expect(orgChannelRow?.isEnabled).toBe(1)

    const integrationRow = await env.DB.prepare(
      'SELECT status, config FROM organization_integrations WHERE organizationId = ? AND provider = ?',
    )
      .bind(organizationId, 'whatsapp_cloud')
      .first<{ status: string; config: string }>()
    expect(integrationRow).toBeTruthy()
    expect(integrationRow?.status).toBe('active')
    expect(JSON.parse(integrationRow!.config)).toMatchObject({
      phoneNumberId: 'waha-phone-sync-1',
    })

    const getRes = await apiRequest('/channel-endpoints/whatsapp', {
      headers: { cookie },
    })
    expect(getRes.status).toBe(200)
    const getBody = (await getRes.json()) as { endpoint: Record<string, unknown> }
    expect(getOrganizationWhatsAppEndpointResponseSchema.safeParse(getBody).success).toBe(true)
    expect(getBody.endpoint).toMatchObject({
      endpointId: putBody.endpoint.endpointId,
      status: 'active',
      linkingStatus: 'active',
      connectionStatus: 'connected',
    })
  })

  it('POST /webhooks/whatsapp-channel-status with signed "disconnected" and "error" deactivates endpoint, suspends link, disables channel, and updates integration status', async () => {
    const { organizationId, cookie } = await createAuthenticatedAgency()

    const putRes = await apiRequest('/channel-endpoints/whatsapp', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ number: '+54 9 11 7777-8888' }),
    })
    expect(putRes.status).toBe(200)

    const sendSignedStatus = async (
      status: 'connected' | 'disconnected' | 'error',
      phoneNumberId?: string,
    ) => {
      const rawBody = JSON.stringify({
        phoneNumber: '5491177778888',
        ...(phoneNumberId ? { phoneNumberId } : {}),
        status,
      })
      return apiRequest('/webhooks/whatsapp-channel-status', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': await signStatusWebhook(rawBody),
        },
        body: rawBody,
      })
    }

    expect((await sendSignedStatus('connected', 'waha-phone-777')).status).toBe(200)
    // Re-connecting with updated phoneNumberId upserts existing organization_integrations without duplicating
    expect((await sendSignedStatus('connected', 'waha-phone-777-v2')).status).toBe(200)
    const integrationAfterReconnect = await env.DB.prepare(
      'SELECT COUNT(*) as count, MAX(config) as config FROM organization_integrations WHERE organizationId = ? AND provider = ?',
    )
      .bind(organizationId, 'whatsapp_cloud')
      .first<{ count: number; config: string }>()
    expect(integrationAfterReconnect?.count).toBe(1)
    expect(JSON.parse(integrationAfterReconnect!.config)).toMatchObject({
      phoneNumberId: 'waha-phone-777-v2',
    })

    const discRes = await sendSignedStatus('disconnected')
    expect(discRes.status).toBe(200)
    const discBody = (await discRes.json()) as { endpoint: Record<string, unknown> }
    expect(discBody.endpoint).toMatchObject({
      status: 'inactive',
      linkingStatus: 'suspended',
      connectionStatus: 'disconnected',
    })

    const orgChannelAfterDisc = await env.DB.prepare(
      'SELECT isEnabled FROM organization_channels WHERE organizationId = ?',
    )
      .bind(organizationId)
      .first<Record<string, unknown>>()
    expect(orgChannelAfterDisc?.isEnabled).toBe(0)

    const integrationAfterDisc = await env.DB.prepare(
      'SELECT status FROM organization_integrations WHERE organizationId = ? AND provider = ?',
    )
      .bind(organizationId, 'whatsapp_cloud')
      .first<Record<string, unknown>>()
    expect(integrationAfterDisc?.status).toBe('disabled')

    const errRes = await sendSignedStatus('error')
    expect(errRes.status).toBe(200)
    const errBody = (await errRes.json()) as { endpoint: Record<string, unknown> }
    expect(errBody.endpoint).toMatchObject({
      status: 'inactive',
      linkingStatus: 'suspended',
      connectionStatus: 'error',
    })

    const integrationAfterErr = await env.DB.prepare(
      'SELECT status FROM organization_integrations WHERE organizationId = ? AND provider = ?',
    )
      .bind(organizationId, 'whatsapp_cloud')
      .first<Record<string, unknown>>()
    expect(integrationAfterErr?.status).toBe('error')

    const getRes = await apiRequest('/channel-endpoints/whatsapp', {
      headers: { cookie },
    })
    expect(getRes.status).toBe(200)
    expect((await getRes.json()) as any).toMatchObject({
      endpoint: {
        status: 'inactive',
        linkingStatus: 'suspended',
        connectionStatus: 'error',
      },
    })
  })

  it('PUT /channel-endpoints/whatsapp with a new number resets connectionStatus to null', async () => {
    const { cookie } = await createAuthenticatedAgency()

    const putInitial = await apiRequest('/channel-endpoints/whatsapp', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ number: '+54 9 11 2222-3333' }),
    })
    expect(putInitial.status).toBe(200)

    const connectedBody = JSON.stringify({
      phoneNumber: '5491122223333',
      phoneNumberId: 'waha-phone-222',
      status: 'connected',
    })
    const syncRes = await apiRequest('/webhooks/whatsapp-channel-status', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': await signStatusWebhook(connectedBody),
      },
      body: connectedBody,
    })
    expect(syncRes.status).toBe(200)

    const putUpdated = await apiRequest('/channel-endpoints/whatsapp', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ number: '+54 9 11 9999-1111' }),
    })
    expect(putUpdated.status).toBe(200)
    const updatedBody = (await putUpdated.json()) as { endpoint: Record<string, unknown> }
    expect(updatedBody.endpoint).toMatchObject({
      number: '+54 9 11 9999-1111',
      status: 'inactive',
      linkingStatus: 'suspended',
      connectionStatus: null,
    })

    const getRes = await apiRequest('/channel-endpoints/whatsapp', {
      headers: { cookie },
    })
    expect(getRes.status).toBe(200)
    expect(await getRes.json()).toEqual(updatedBody)
  })

  it('POST /webhooks/whatsapp-channel-status returns 401 on invalid signature and 404 on unknown phone', async () => {
    const payload = JSON.stringify({
      phoneNumber: '5491198765432',
      status: 'connected',
    })

    const badSigRes = await apiRequest('/webhooks/whatsapp-channel-status', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': await signStatusWebhook(payload, 'wrong-secret'),
      },
      body: payload,
    })
    expect(badSigRes.status).toBe(401)

    const unknownPhoneRes = await apiRequest('/webhooks/whatsapp-channel-status', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': await signStatusWebhook(payload),
      },
      body: payload,
    })
    expect(unknownPhoneRes.status).toBe(404)
  })
})
