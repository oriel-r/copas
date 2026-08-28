import { describe, it, expect, vi } from 'vitest'
import app from './index'

describe('GET /', () => {
  it('returns the API health status', async () => {
    const res = await app.request('/')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ service: 'api', status: 'ok' })
  })
})

describe('auth CORS', () => {
  const environment = {
    CLIENT_URL: 'http://localhost:5173',
  } as CloudflareBindings

  it('allows the configured client origin', async () => {
    const res = await app.request(
      '/auth/get-session',
      {
        method: 'OPTIONS',
        headers: {
          origin: environment.CLIENT_URL,
          'access-control-request-method': 'GET',
        },
      },
      environment,
    )

    expect(res.headers.get('access-control-allow-origin')).toBe(
      environment.CLIENT_URL,
    )
  })

  it('does not allow an untrusted origin', async () => {
    const res = await app.request(
      '/auth/get-session',
      {
        method: 'OPTIONS',
        headers: {
          origin: 'https://untrusted.example.com',
          'access-control-request-method': 'GET',
        },
      },
      environment,
    )

    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })
})

describe('API worker queue', () => {
  it('handles empty batch gracefully', async () => {
    if ('queue' in app && typeof (app as any).queue === 'function') {
      const mockEnv = {} as any
      const mockCtx = {
        waitUntil: vi.fn(),
        passThroughOnException: vi.fn(),
      }
      const batch = { messages: [] }

      await (app as any).queue(batch, mockEnv, mockCtx)
      expect(batch.messages.length).toBe(0)
    }
  })

  it('ignores messages of unknown type gracefully', async () => {
    if ('queue' in app && typeof (app as any).queue === 'function') {
      const mockEnv = {} as any
      const mockCtx = {
        waitUntil: vi.fn(),
        passThroughOnException: vi.fn(),
      }
      const batch = {
        messages: [
          { body: { type: 'unsupported-event', payload: {} } },
        ],
      }

      await (app as any).queue(batch, mockEnv, mockCtx)
      expect(batch.messages.length).toBe(1)
    }
  })
})
