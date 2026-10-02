import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { applyMiddlewares } from './app.middlewares'

describe('applyMiddlewares', () => {
  const setupApp = () => {
    const app = new Hono<{
      Bindings: CloudflareBindings
    }>()
    applyMiddlewares(app)
    app.get('/api/test', (c) => c.json({ ok: true }))
    return app
  }

  const env = {
    CLIENT_URL: 'http://localhost:5173',
    NODE_ENV: 'test',
  } as CloudflareBindings

  describe('CORS handling', () => {
    it('handles OPTIONS preflight requests for allowed origin', async () => {
      const app = setupApp()
      const res = await app.request(
        '/api/test',
        {
          method: 'OPTIONS',
          headers: {
            origin: 'http://localhost:5173',
            'access-control-request-method': 'GET',
          },
        },
        env,
      )

      expect(res.status).toBe(204)
      expect(res.headers.get('access-control-allow-origin')).toBe(
        'http://localhost:5173',
      )
      expect(res.headers.get('access-control-allow-credentials')).toBe('true')
      expect(res.headers.get('access-control-allow-methods')).toContain('GET')
    })

    it('does not allow untrusted origin in CORS preflight', async () => {
      const app = setupApp()
      const res = await app.request(
        '/api/test',
        {
          method: 'OPTIONS',
          headers: {
            origin: 'https://malicious-site.example.com',
            'access-control-request-method': 'GET',
          },
        },
        env,
      )

      expect(res.headers.get('access-control-allow-origin')).toBeNull()
    })
  })

  describe('Request headers and tracking', () => {
    it('sets x-request-id on normal requests', async () => {
      const app = setupApp()
      const res = await app.request('/api/test', undefined, env)

      expect(res.status).toBe(200)
      expect(res.headers.get('x-request-id')).toBeTruthy()
      expect(res.headers.get('x-request-id')).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    })
  })
})
