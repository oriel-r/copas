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

  it('sends PUT requests with body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ updated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await http.put<{ updated: boolean }>('/api/item/1', { title: 'New' })
    expect(result).toEqual({ updated: true })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/item/1')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string)).toEqual({ title: 'New' })
  })

  it('sends PATCH requests with partial body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ patched: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await http.patch<{ patched: boolean }>('/api/item/1', { status: 'active' })
    expect(result).toEqual({ patched: true })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/item/1')
    expect(init.method).toBe('PATCH')
  })

  it('sends DELETE requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ deleted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await http.delete<{ deleted: boolean }>('/api/item/1')
    expect(result).toEqual({ deleted: true })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/item/1')
    expect(init.method).toBe('DELETE')
  })

  it('preserves custom headers provided in options', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await http.get('/api/custom', { headers: { 'X-Custom-Header': 'custom-val' } })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers['X-Custom-Header']).toBe('custom-val')
  })
})
