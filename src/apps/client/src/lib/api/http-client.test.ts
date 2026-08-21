import { describe, expect, it, afterEach, vi } from 'vitest'
import { ApiError } from './api-error'
import { http } from './http-client'

describe('http client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends JSON bodies with credentials and returns parsed JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await http.post<{ ok: boolean }>('/api/thing', { name: 'x' })

    expect(result).toEqual({ ok: true })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/thing')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(JSON.parse(init.body as string)).toEqual({ name: 'x' })
  })

  it('resolves undefined for 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))

    await expect(http.get('/api/empty')).resolves.toBeUndefined()
  })

  it('throws ApiError with message and details for non-ok JSON responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'algo salió mal' }), {
          status: 422,
          statusText: 'Unprocessable Entity',
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    const error = (await http.get('/api/bad').catch((caught) => caught)) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(422)
    expect(error.message).toBe('algo salió mal')
    expect(error.details).toEqual({ message: 'algo salió mal' })
  })

  it('falls back to statusText when the error body has no message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      ),
    )

    const error = (await http.get('/api/broken').catch((caught) => caught)) as ApiError

    expect(error.message).toBe('Internal Server Error')
    expect(error.details).toBeNull()
  })
})
