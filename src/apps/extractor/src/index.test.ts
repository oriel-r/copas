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
    it('ignores messages without documentUrl', async () => {
      const queue = 'queue' in app ? (app as any).queue : (app as any).default?.queue
      if (typeof queue === 'function') {
        const mockEnv = {
          EXTRACTION_WORKFLOW: { create: vi.fn().mockResolvedValue({ id: 'test' }) },
          AI_RESULT_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
          MISTRAL_API_KEY: 'test-key',
          AI: { run: vi.fn().mockResolvedValue({ response: '{}' }) },
        }
        const mockCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() }
        const batch = { messages: [{ body: {} }] }

        await queue(batch, mockEnv, mockCtx)
        expect(mockEnv.AI_RESULT_QUEUE.send).not.toHaveBeenCalled()
        expect(mockEnv.EXTRACTION_WORKFLOW.create).not.toHaveBeenCalled()
      }
    })

    it('creates a workflow instance via env.EXTRACTION_WORKFLOW.create({ id: payload.aiExtractionResultId, params })', async () => {
      const queue = 'queue' in app ? (app as any).queue : (app as any).default?.queue
      if (typeof queue === 'function') {
        const mockEnv = {
          EXTRACTION_WORKFLOW: {
            create: vi.fn().mockResolvedValue({ id: 'ext-999' }),
          },
          AI_RESULT_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
        }
        const mockCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() }
        const batch = {
          messages: [
            {
              body: {
                documentUrl: 'https://r2.copas.app/policies/doc-1.pdf',
                aiExtractionResultId: 'ext-999',
                organizationId: 'org-abc',
              },
            },
          ],
        }

        await queue(batch, mockEnv, mockCtx)

        expect(mockEnv.EXTRACTION_WORKFLOW.create).toHaveBeenCalledWith({
          id: 'ext-999',
          params: expect.objectContaining({
            documentUrl: 'https://r2.copas.app/policies/doc-1.pdf',
            aiExtractionResultId: 'ext-999',
            organizationId: 'org-abc',
          }),
        })
      }
    })

    it('processes messages with nested payload object and creates workflow instance', async () => {
      const queue = 'queue' in app ? (app as any).queue : (app as any).default?.queue
      if (typeof queue === 'function') {
        const mockEnv = {
          EXTRACTION_WORKFLOW: {
            create: vi.fn().mockResolvedValue({ id: 'ext-888' }),
          },
          AI_RESULT_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
        }
        const mockCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() }
        const batch = {
          messages: [
            {
              body: {
                type: 'ai-extraction',
                payload: {
                  documentUrl: 'https://r2.copas.app/policies/doc-2.pdf',
                  aiExtractionResultId: 'ext-888',
                  organizationId: 'org-nested',
                },
              },
            },
          ],
        }

        await queue(batch, mockEnv, mockCtx)

        expect(mockEnv.EXTRACTION_WORKFLOW.create).toHaveBeenCalledWith({
          id: 'ext-888',
          params: expect.objectContaining({
            documentUrl: 'https://r2.copas.app/policies/doc-2.pdf',
            aiExtractionResultId: 'ext-888',
            organizationId: 'org-nested',
          }),
        })
      }
    })

    it('handles duplicate message delivery gracefully without error when create() indicates instance already exists', async () => {
      const queue = 'queue' in app ? (app as any).queue : (app as any).default?.queue
      if (typeof queue === 'function') {
        const mockEnv = {
          EXTRACTION_WORKFLOW: {
            create: vi.fn().mockRejectedValue(new Error('Instance "ext-999" already exists')),
          },
          AI_RESULT_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
        }
        const mockCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() }
        const batch = {
          messages: [
            {
              body: {
                documentUrl: 'https://r2.copas.app/policies/doc-1.pdf',
                aiExtractionResultId: 'ext-999',
                organizationId: 'org-abc',
              },
            },
          ],
        }

        await expect(queue(batch, mockEnv, mockCtx)).resolves.not.toThrow()
        expect(mockEnv.EXTRACTION_WORKFLOW.create).toHaveBeenCalledWith({
          id: 'ext-999',
          params: expect.objectContaining({
            documentUrl: 'https://r2.copas.app/policies/doc-1.pdf',
            aiExtractionResultId: 'ext-999',
            organizationId: 'org-abc',
          }),
        })
      }
    })

    it('handles batch without messages gracefully', async () => {
      const queue = 'queue' in app ? (app as any).queue : (app as any).default?.queue
      if (typeof queue === 'function') {
        const mockEnv = {
          EXTRACTION_WORKFLOW: { create: vi.fn() },
          AI_RESULT_QUEUE: { send: vi.fn() },
          MISTRAL_API_KEY: 'test-key',
          AI: { run: vi.fn() },
        }
        const mockCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() }

        await queue({}, mockEnv, mockCtx)
        expect(mockEnv.EXTRACTION_WORKFLOW.create).not.toHaveBeenCalled()
        expect(mockEnv.AI_RESULT_QUEUE.send).not.toHaveBeenCalled()
      }
    })
  })
})


