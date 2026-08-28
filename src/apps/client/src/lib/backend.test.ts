import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { backendUrl, probeBackend } from './backend'

describe('backend', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  describe('backendUrl', () => {
    it('normalizes path without leading slash', () => {
      expect(backendUrl('api/policies')).toMatch(/\/api\/policies$/)
    })

    it('normalizes path with leading slash', () => {
      expect(backendUrl('/api/policies')).toMatch(/\/api\/policies$/)
    })

    it('normalizes empty path', () => {
      expect(backendUrl('')).toMatch(/\/$/)
    })
  })

  describe('probeBackend', () => {
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

    it('uses custom timeout when provided', async () => {
      const fetchMock = vi.fn().mockImplementation((_url, init) => {
        return new Promise((resolve) => {
          const timer = setTimeout(resolve, 50)
          if (init?.signal) {
            init.signal.addEventListener('abort', () => clearTimeout(timer))
          }
        })
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await probeBackend(200)
      expect(result).toBe(true)
    })
  })
})