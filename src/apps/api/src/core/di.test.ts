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
})
