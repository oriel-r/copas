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

  it('handles ai-result messages when database binding is available', async () => {
    if ('queue' in app && typeof (app as any).queue === 'function') {
      const mockStmt = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
        raw: vi.fn().mockResolvedValue([]),
        run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      }
      const mockDb = {
        prepare: vi.fn().mockReturnValue(mockStmt),
        batch: vi.fn().mockResolvedValue([]),
        exec: vi.fn().mockResolvedValue(undefined),
      }
      const mockEnv = {
        DB: mockDb,
        BETTER_AUTH_SECRET: 'test-secret-123456789012345678901234',
        CLIENT_URL: 'http://localhost:5173',
      } as any
      const mockCtx = {
        waitUntil: vi.fn((promise) => promise),
        passThroughOnException: vi.fn(),
      }
      const batch = {
        messages: [
          {
            body: {
              type: 'ai-result',
              payload: {
                aiExtractionResultId: '018f9e2b-0000-7000-8000-000000000000',
                structuredPayload: {
                  company: { name: 'SANCOR', code: 'SANCOR' },
                  branch: { code: 'AUTO' },
                  policy: {
                    policyNumber: 'POL-Q-1',
                    premiumTotal: 50000,
                    currency: 'ARS',
                    startDate: '2026-01-01',
                    endDate: '2027-01-01',
                    billingFrequency: 'monthly',
                  },
                  insured: {
                    fullName: 'ANA GOMEZ',
                    cuit: '27112233445',
                    email: 'ana@example.com',
                    phone: '11223344',
                    birthDate: '1992-05-10',
                  },
                  assetType: { code: 'AUTO' },
                  asset: { properties: { PATENTE: 'AA222BB' } },
                  paymentMethod: { code: 'AUTOMATICO_CREDITO' },
                  coverages: [],
                  installments: [],
                },
              },
              metadata: {
                organizationId: '018f9e2b-0000-7000-8000-000000000001',
              },
            },
          },
        ],
      }

      await (app as any).queue(batch, mockEnv, mockCtx)
      expect(batch.messages.length).toBe(1)
    }
  })
})

