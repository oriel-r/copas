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
    const validPolicyExtraction = {
      company: { name: 'MERCANTIL ANDINA', code: 'MERCANTIL' },
      branch: { code: 'AUTO' },
      policy: {
        policyNumber: 'MA-112233',
        premiumTotal: 100000,
        currency: 'ARS',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        billingFrequency: 'monthly',
      },
      insured: {
        fullName: 'JUAN PEREZ',
        cuit: '20334455667',
        email: 'juan@example.com',
        phone: '1122334455',
        birthDate: '1990-01-01',
      },
      assetType: { code: 'AUTO' },
      asset: { properties: { PATENTE: 'AA111BB' } },
      paymentMethod: { code: 'AUTOMATICO_CREDITO' },
      coverages: [],
      installments: [],
    }

    it('ignores messages without documentUrl', async () => {
      if ('queue' in app && typeof (app as any).queue === 'function') {
        const mockEnv = {
          AI_RESULT_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
          MISTRAL_API_KEY: 'test-key',
          AI: { run: vi.fn().mockResolvedValue({ response: '{}' }) },
        }
        const mockCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() }
        const batch = { messages: [{ body: {} }] }

        await (app as any).queue(batch, mockEnv, mockCtx)
        expect(mockEnv.AI_RESULT_QUEUE.send).not.toHaveBeenCalled()
      }
    })

    it('processes messages with documentUrl and sends extraction result to AI_RESULT_QUEUE', async () => {
      if ('queue' in app && typeof (app as any).queue === 'function') {
        const fetchMock = vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ markdown: '# OCR text content' }), { status: 200 }),
        )
        vi.stubGlobal('fetch', fetchMock)

        const mockEnv = {
          AI_RESULT_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
          MISTRAL_API_KEY: 'test-key',
          AI: {
            run: vi.fn().mockResolvedValue({
              response: JSON.stringify(validPolicyExtraction),
            }),
          },
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

        await (app as any).queue(batch, mockEnv, mockCtx)

        expect(mockEnv.AI_RESULT_QUEUE.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'ai-result',
            payload: expect.objectContaining({
              aiExtractionResultId: 'ext-999',
              structuredPayload: expect.objectContaining({
                company: expect.objectContaining({ name: 'MERCANTIL ANDINA' }),
              }),
            }),
            metadata: expect.objectContaining({
              organizationId: 'org-abc',
              idempotencyKey: 'ext-999',
            }),
          }),
        )

        vi.unstubAllGlobals()
      }
    })

    it('processes messages with nested payload object and sends extraction result to AI_RESULT_QUEUE', async () => {
      if ('queue' in app && typeof (app as any).queue === 'function') {
        const fetchMock = vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ markdown: '# OCR text content' }), { status: 200 }),
        )
        vi.stubGlobal('fetch', fetchMock)

        const mockEnv = {
          AI_RESULT_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
          MISTRAL_API_KEY: 'test-key',
          AI: {
            run: vi.fn().mockResolvedValue({
              response: JSON.stringify(validPolicyExtraction),
            }),
          },
        }
        const mockCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() }
        const batch = {
          messages: [
            {
              body: {
                payload: {
                  documentUrl: 'https://r2.copas.app/policies/doc-2.pdf',
                  aiExtractionResultId: 'ext-888',
                  organizationId: 'org-nested',
                },
              },
            },
          ],
        }

        await (app as any).queue(batch, mockEnv, mockCtx)

        expect(mockEnv.AI_RESULT_QUEUE.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'ai-result',
            payload: expect.objectContaining({
              aiExtractionResultId: 'ext-888',
            }),
            metadata: expect.objectContaining({
              organizationId: 'org-nested',
            }),
          }),
        )

        vi.unstubAllGlobals()
      }
    })

    it('handles batch without messages gracefully', async () => {
      if ('queue' in app && typeof (app as any).queue === 'function') {
        const mockEnv = {
          AI_RESULT_QUEUE: { send: vi.fn() },
          MISTRAL_API_KEY: 'test-key',
          AI: { run: vi.fn() },
        }
        const mockCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() }

        await (app as any).queue({}, mockEnv, mockCtx)
        expect(mockEnv.AI_RESULT_QUEUE.send).not.toHaveBeenCalled()
      }
    })
  })
})


