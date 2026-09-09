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
  const sampleStructuredPayload = {
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
  }

  const createMockDb = (options: { fail?: boolean } = {}) => {
    if (options.fail) {
      const failingStmt = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockRejectedValue(new Error('DB failure')),
        all: vi.fn().mockRejectedValue(new Error('DB failure')),
        raw: vi.fn().mockRejectedValue(new Error('DB failure')),
        run: vi.fn().mockRejectedValue(new Error('DB failure')),
      }
      return {
        prepare: vi.fn().mockReturnValue(failingStmt),
        batch: vi.fn().mockRejectedValue(new Error('DB failure')),
        exec: vi.fn().mockRejectedValue(new Error('DB failure')),
      }
    }

    const mockStmt = {
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({ results: [] }),
      raw: vi.fn().mockResolvedValue([]),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
    }
    return {
      prepare: vi.fn().mockReturnValue(mockStmt),
      batch: vi.fn().mockResolvedValue([]),
      exec: vi.fn().mockResolvedValue(undefined),
    }
  }

  const createMockEnv = (options: { fail?: boolean } = {}) =>
    ({
      DB: createMockDb(options),
      BETTER_AUTH_SECRET: 'test-secret-123456789012345678901234',
      CLIENT_URL: 'http://localhost:5173',
    }) as any

  const createMockCtx = () => ({
    waitUntil: vi.fn((promise) => promise),
    passThroughOnException: vi.fn(),
  })

  it('handles empty batch gracefully', async () => {
    const mockCtx = createMockCtx()
    const batch = { messages: [] }

    await (app as any).queue(batch, createMockEnv(), mockCtx)
    expect(batch.messages.length).toBe(0)
  })

  it('calls message.ack() on non-AI message and ignores it', async () => {
    const mockCtx = createMockCtx()
    const mockEnv = createMockEnv()
    const ack = vi.fn()
    const batch = {
      messages: [{ body: { type: 'unsupported-event', payload: {} }, ack }],
    }

    await (app as any).queue(batch, mockEnv, mockCtx)
    expect(ack).toHaveBeenCalled()
    expect(mockEnv.DB.prepare).not.toHaveBeenCalled()
  })

  it('calls message.ack() and skips processing on AI message without organizationId', async () => {
    const mockCtx = createMockCtx()
    const mockEnv = createMockEnv()
    const ack = vi.fn()
    const batch = {
      messages: [
        {
          body: {
            type: 'ai-result',
            payload: {
              aiExtractionResultId: '018f9e2b-0000-7000-8000-000000000000',
              structuredPayload: sampleStructuredPayload,
            },
          },
          ack,
        },
      ],
    }

    await (app as any).queue(batch, mockEnv, mockCtx)
    expect(ack).toHaveBeenCalled()
    expect(mockEnv.DB.prepare).not.toHaveBeenCalled()
  })

  it('processes AI message when body.type is ai_result (underscore variant) and calls ack()', async () => {
    const mockCtx = createMockCtx()
    const mockEnv = createMockEnv()
    const ack = vi.fn()
    const batch = {
      messages: [
        {
          body: {
            type: 'ai_result',
            payload: {
              aiExtractionResultId: '018f9e2b-0000-7000-8000-000000000000',
              structuredPayload: sampleStructuredPayload,
            },
            metadata: {
              organizationId: '018f9e2b-0000-7000-8000-000000000001',
            },
          },
          ack,
        },
      ],
    }

    await (app as any).queue(batch, mockEnv, mockCtx)
    expect(ack).toHaveBeenCalled()
    expect(mockEnv.DB.prepare).toHaveBeenCalled()
  })

  it('processes AI message when structuredPayload is directly on body and calls ack()', async () => {
    const mockCtx = createMockCtx()
    const mockEnv = createMockEnv()
    const ack = vi.fn()
    const batch = {
      messages: [
        {
          body: {
            aiExtractionResultId: '018f9e2b-0000-7000-8000-000000000000',
            structuredPayload: sampleStructuredPayload,
            metadata: {
              organizationId: '018f9e2b-0000-7000-8000-000000000001',
            },
          },
          ack,
        },
      ],
    }

    await (app as any).queue(batch, mockEnv, mockCtx)
    expect(ack).toHaveBeenCalled()
    expect(mockEnv.DB.prepare).toHaveBeenCalled()
  })

  it('processes AI message when structuredPayload is in body.payload and calls ack()', async () => {
    const mockCtx = createMockCtx()
    const mockEnv = createMockEnv()
    const ack = vi.fn()
    const batch = {
      messages: [
        {
          body: {
            payload: {
              aiExtractionResultId: '018f9e2b-0000-7000-8000-000000000000',
              structuredPayload: sampleStructuredPayload,
            },
            metadata: {
              organizationId: '018f9e2b-0000-7000-8000-000000000001',
            },
          },
          ack,
        },
      ],
    }

    await (app as any).queue(batch, mockEnv, mockCtx)
    expect(ack).toHaveBeenCalled()
    expect(mockEnv.DB.prepare).toHaveBeenCalled()
  })

  it('calls message.retry({ delaySeconds }) when processing fails and retry is a function', async () => {
    const mockCtx = createMockCtx()
    const mockEnv = createMockEnv({ fail: true })
    const ack = vi.fn()
    const retry = vi.fn()
    const batch = {
      messages: [
        {
          body: {
            type: 'ai-result',
            payload: {
              aiExtractionResultId: '018f9e2b-0000-7000-8000-000000000000',
              structuredPayload: sampleStructuredPayload,
            },
            metadata: {
              organizationId: '018f9e2b-0000-7000-8000-000000000001',
            },
          },
          ack,
          retry,
        },
      ],
    }

    await (app as any).queue(batch, mockEnv, mockCtx)
    expect(retry).toHaveBeenCalledWith({ delaySeconds: expect.any(Number) })
    expect(ack).not.toHaveBeenCalled()
  })

  it('rethrows error when processing fails and retry is not a function', async () => {
    const mockCtx = createMockCtx()
    const mockEnv = createMockEnv({ fail: true })
    const ack = vi.fn()
    const batch = {
      messages: [
        {
          body: {
            type: 'ai-result',
            payload: {
              aiExtractionResultId: '018f9e2b-0000-7000-8000-000000000000',
              structuredPayload: sampleStructuredPayload,
            },
            metadata: {
              organizationId: '018f9e2b-0000-7000-8000-000000000001',
            },
          },
          ack,
          // retry is undefined
        },
      ],
    }

    await expect(
      (app as any).queue(batch, mockEnv, mockCtx),
    ).rejects.toThrow()
    expect(ack).not.toHaveBeenCalled()
  })

  describe('requestId fallback resolution', () => {
    it('uses requestId from metadata if provided', async () => {
      const mockCtx = createMockCtx()
      const mockEnv = createMockEnv()
      const ack = vi.fn()
      const batch = {
        messages: [
          {
            body: {
              type: 'ai-result',
              payload: {
                aiExtractionResultId: '018f9e2b-0000-7000-8000-000000000000',
                structuredPayload: sampleStructuredPayload,
              },
              metadata: {
                organizationId: '018f9e2b-0000-7000-8000-000000000001',
                requestId: 'meta-request-id-123',
              },
            },
            ack,
          },
        ],
      }

      await (app as any).queue(batch, mockEnv, mockCtx)
      expect(ack).toHaveBeenCalled()
    })

    it('uses requestId from payload when metadata does not provide it', async () => {
      const mockCtx = createMockCtx()
      const mockEnv = createMockEnv()
      const ack = vi.fn()
      const batch = {
        messages: [
          {
            body: {
              type: 'ai-result',
              payload: {
                aiExtractionResultId: '018f9e2b-0000-7000-8000-000000000000',
                structuredPayload: sampleStructuredPayload,
                requestId: 'payload-request-id-456',
              },
              metadata: {
                organizationId: '018f9e2b-0000-7000-8000-000000000001',
              },
            },
            ack,
          },
        ],
      }

      await (app as any).queue(batch, mockEnv, mockCtx)
      expect(ack).toHaveBeenCalled()
    })

    it('falls back to generated UUID when neither metadata nor payload contains requestId', async () => {
      const mockCtx = createMockCtx()
      const mockEnv = createMockEnv()
      const ack = vi.fn()
      const batch = {
        messages: [
          {
            body: {
              type: 'ai-result',
              payload: {
                aiExtractionResultId: '018f9e2b-0000-7000-8000-000000000000',
                structuredPayload: sampleStructuredPayload,
              },
              metadata: {
                organizationId: '018f9e2b-0000-7000-8000-000000000001',
              },
            },
            ack,
          },
        ],
      }

      await (app as any).queue(batch, mockEnv, mockCtx)
      expect(ack).toHaveBeenCalled()
    })
  })
})

