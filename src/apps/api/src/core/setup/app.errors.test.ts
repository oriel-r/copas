import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { registerErrorHandlers } from './app.errors'

describe('registerErrorHandlers', () => {
  const setupApp = () => {
    const app = new Hono()
    registerErrorHandlers(app)

    app.get('/ok', (c) => c.text('ok', 200))
    app.get('/http-400', () => {
      throw new HTTPException(400, { message: 'Custom 400' })
    })
    app.get('/http-500', () => {
      throw new HTTPException(500, { message: 'Custom 500' })
    })
    app.get('/generic-error', () => {
      throw new Error('Boom')
    })

    return app
  }

  it('returns 200 for normal routes', async () => {
    const app = setupApp()
    const res = await app.request('/ok')

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })

  it('returns 404 with standard error body for non-existent routes', async () => {
    const app = setupApp()
    const res = await app.request('/non-existent')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      success: false,
      error: 'Not Found',
    })
  })

  it('handles HTTPException with status 400', async () => {
    const app = setupApp()
    const res = await app.request('/http-400')

    expect(res.status).toBe(400)
  })

  it('handles HTTPException with status 500', async () => {
    const app = setupApp()
    const res = await app.request('/http-500')

    expect(res.status).toBe(500)
  })

  it('handles generic Error with status 500 and standard error body', async () => {
    const app = setupApp()
    const res = await app.request('/generic-error')

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      success: false,
      error: 'Internal Server Error',
    })
  })
})
