import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { injectAppServices } from './di'

describe('injectAppServices', () => {
  const createMockEnv = (): CloudflareBindings => {
    return {
      DB: {} as D1Database,
      WHATSAPP_QUEUE: {} as Queue,
    } as CloudflareBindings
  }

  it('injects insurance, communications, and reminders services when organizationId is present in context', async () => {
    const app = new Hono<{
      Bindings: CloudflareBindings
      Variables: {
        organizationId?: string | null
        services?: any
      }
    }>()

    app.use('*', async (c, next) => {
      c.set('organizationId', 'org-123')
      await next()
    })
    app.use('*', injectAppServices)

    app.get('/test', (c) => {
      const services = c.get('services')
      return c.json({
        insurance: !!services?.insurance,
        communications: !!services?.communications,
        reminders: !!services?.reminders,
      })
    })

    const res = await app.request('/test', undefined, createMockEnv())
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.insurance).toBe(true)
    expect(json.communications).toBe(true)
    expect(json.reminders).toBe(true)
  })

  it('injects insurance, communications, and reminders services when organizationId is null', async () => {
    const app = new Hono<{
      Bindings: CloudflareBindings
      Variables: {
        organizationId?: string | null
        services?: any
      }
    }>()

    app.use('*', async (c, next) => {
      c.set('organizationId', null)
      await next()
    })
    app.use('*', injectAppServices)

    app.get('/test', (c) => {
      const services = c.get('services')
      return c.json({
        insurance: !!services?.insurance,
        communications: !!services?.communications,
        reminders: !!services?.reminders,
      })
    })

    const res = await app.request('/test', undefined, createMockEnv())
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.insurance).toBe(true)
    expect(json.communications).toBe(true)
    expect(json.reminders).toBe(true)
  })

  it('injects services with default organizationId when organizationId is undefined', async () => {
    const app = new Hono<{
      Bindings: CloudflareBindings
      Variables: {
        organizationId?: string | null
        services?: any
      }
    }>()

    app.use('*', injectAppServices)

    app.get('/test', (c) => {
      const services = c.get('services')
      return c.json({
        servicesDefined: !!services,
        keys: Object.keys(services || {}),
      })
    })

    const res = await app.request('/test', undefined, createMockEnv())
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.servicesDefined).toBe(true)
    expect(json.keys).toContain('insurance')
    expect(json.keys).toContain('communications')
    expect(json.keys).toContain('reminders')
  })

  it('enforces 401 on /channel-endpoints/whatsapp when organizationId is null', async () => {
    const app = new Hono<{
      Bindings: CloudflareBindings
      Variables: {
        organizationId?: string | null
        services?: any
      }
    }>()

    app.use('*', async (c, next) => {
      c.set('organizationId', null)
      await next()
    })
    app.use('*', injectAppServices)
    app.get('/channel-endpoints/whatsapp', (c) => c.json({ ok: true }))
    app.put('/channel-endpoints/whatsapp', (c) => c.json({ ok: true }))

    const getRes = await app.request('/channel-endpoints/whatsapp', undefined, createMockEnv())
    expect(getRes.status).toBe(401)

    const putRes = await app.request(
      '/channel-endpoints/whatsapp',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: '+54 9 11 1234-5678' }),
      },
      createMockEnv(),
    )
    expect(putRes.status).toBe(401)
  })

  it('enforces 401 on /channel-endpoints/whatsapp when organizationId is undefined', async () => {
    const app = new Hono<{
      Bindings: CloudflareBindings
      Variables: {
        organizationId?: string | null
        services?: any
      }
    }>()

    app.use('*', injectAppServices)
    app.get('/channel-endpoints/whatsapp', (c) => c.json({ ok: true }))

    const res = await app.request('/channel-endpoints/whatsapp', undefined, createMockEnv())
    expect(res.status).toBe(401)
  })

  it('allows /channel-endpoints/whatsapp and injects services when organizationId is present', async () => {
    const app = new Hono<{
      Bindings: CloudflareBindings
      Variables: {
        organizationId?: string | null
        services?: any
      }
    }>()

    app.use('*', async (c, next) => {
      c.set('organizationId', 'org-123')
      await next()
    })
    app.use('*', injectAppServices)
    app.get('/channel-endpoints/whatsapp', (c) => {
      const services = c.get('services')
      return c.json({
        ok: true,
        hasChannelEndpoints: !!services?.communications?.channelEndpoints,
      })
    })

    const res = await app.request('/channel-endpoints/whatsapp', undefined, createMockEnv())
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; hasChannelEndpoints: boolean }
    expect(body.ok).toBe(true)
    expect(body.hasChannelEndpoints).toBe(true)
  })
})
