import { afterEach, describe, expect, it, vi } from 'vitest'
import { probeBackend } from './backend'

describe('probeBackend', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns true when the backend is reachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}))
    await expect(probeBackend(100)).resolves.toBe(true)
  })

  it('returns false when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(probeBackend(100)).resolves.toBe(false)
  })

  it('returns false when the request times out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'TimeoutError')))
    await expect(probeBackend(100)).resolves.toBe(false)
  })

  it('probes the root path in no-cors mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({})
    vi.stubGlobal('fetch', fetchMock)

    await probeBackend(100)

    expect(fetchMock).toHaveBeenCalledWith(
      '/',
      expect.objectContaining({ method: 'GET', mode: 'no-cors', signal: expect.any(AbortSignal) }),
    )
  })
})