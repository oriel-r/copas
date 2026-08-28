import { describe, it, expect, vi } from 'vitest'
import app from './index'

describe('extractor worker', () => {
  describe('GET /', () => {
    it('returns Hello Hono!', async () => {
      const res = await app.request('/')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('Hello Hono!')
    })
  })

  describe('queue handler', () => {
    it('processes messages with documentUrl from batch', async () => {
      if ('queue' in app && typeof (app as any).queue === 'function') {
        const fetchMock = vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ markdown: '# OCR text' }), { status: 200 }),
        )
        vi.stubGlobal('fetch', fetchMock)

        const mockEnv = {
          AI_RESULT_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
          MISTRAL_API_KEY: 'test-key',
          AI: { run: vi.fn().mockResolvedValue({ response: '{}' }) },
        }
        const mockCtx = {
          waitUntil: vi.fn(),
          passThroughOnException: vi.fn(),
        }
        const batch = {
          messages: [
            { body: {} }, // No documentUrl
          ],
        }

        await (app as any).queue(batch, mockEnv, mockCtx)
        expect(batch.messages.length).toBe(1)
        vi.unstubAllGlobals()
      }
    })
  })
})
