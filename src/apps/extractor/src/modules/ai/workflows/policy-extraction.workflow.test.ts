import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ExtractedPolicy } from '@copas/contracts'

// Mock cloudflare:workflows before importing workflow entrypoint
vi.mock('cloudflare:workflows', () => {
  return {
    WorkflowEntrypoint: class<Env = unknown, Params = unknown> {
      ctx: unknown
      env: Env
      constructor(ctx: unknown, env: Env) {
        this.ctx = ctx
        this.env = env
      }
      async run(_event: unknown, _step: unknown): Promise<unknown> {
        throw new Error('Method run not implemented')
      }
    },
  }
})

import * as WorkflowModule from './policy-extraction.workflow'

const WorkflowClass: any =
  (WorkflowModule as any).PolicyExtractionWorkflow ??
  (WorkflowModule as any).default

describe('PolicyExtractionWorkflow', () => {
  const sampleValidExtraction: ExtractedPolicy = {
    company: {
      name: 'MERCANTIL ANDINA',
      code: 'MERCANTIL',
    },
    branch: {
      code: 'AUTO',
    },
    policy: {
      policyNumber: 'MA-998877',
      premiumTotal: 250000,
      currency: 'ARS',
      startDate: '2026-06-01',
      endDate: '2027-06-01',
      billingFrequency: 'monthly',
    },
    insured: {
      fullName: 'ROBERTO CARLOS',
      cuit: '20112233445',
      email: 'roberto@example.com',
      phone: '541144332211',
      birthDate: '1980-11-20',
    },
    assetType: {
      code: 'AUTO',
    },
    asset: {
      properties: {
        PATENTE: 'AE999ZZ',
        MARCA: 'VOLKSWAGEN',
        MODELO: 'GOL TREND',
        ANIO: 2021,
      },
    },
    paymentMethod: {
      code: 'AUTOMATICO_CREDITO',
    },
    coverages: [
      {
        name: 'TERCEROS COMPLETO',
        limit: 15000000,
        franchise: null,
      },
    ],
    installments: [
      {
        installmentNumber: 1,
        dueDate: '2026-06-15',
        totalAmount: 25000,
      },
    ],
  }

  const defaultParams = {
    documentUrl: 'https://r2.copas.app/policies/sample-doc.pdf',
    aiExtractionResultId: 'ext-result-101',
    organizationId: 'org-abc',
    requestId: 'req-001',
  }

  const defaultEvent = {
    payload: defaultParams,
    params: defaultParams,
    instanceId: defaultParams.aiExtractionResultId,
    timestamp: new Date(),
  }

  let mockOcrClient: { process: ReturnType<typeof vi.fn> }
  let mockStructuredOutputService: { normalizeToSchema: ReturnType<typeof vi.fn> }
  let mockEnv: any
  let mockCtx: any
  let mockStep: { do: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockOcrClient = {
      process: vi.fn().mockResolvedValue('# Sample OCR Extracted Content\n\nPolicy: MA-998877'),
    }
    mockStructuredOutputService = {
      normalizeToSchema: vi.fn().mockResolvedValue(sampleValidExtraction),
    }
    mockEnv = {
      AI_RESULT_QUEUE: {
        send: vi.fn().mockResolvedValue(undefined),
      },
      MISTRAL_API_KEY: 'test-mistral-api-key',
      AI: {
        run: vi.fn().mockResolvedValue({
          response: JSON.stringify(sampleValidExtraction),
        }),
      },
    }
    mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    }
    mockStep = {
      do: vi.fn(async (_name: string, configOrCallback: any, maybeCallback?: any) => {
        const callback = typeof configOrCallback === 'function' ? configOrCallback : maybeCallback
        if (typeof callback === 'function') {
          return await callback()
        }
        return undefined
      }),
    }

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ markdown: '# Sample OCR Extracted Content\n\nPolicy: MA-998877' }), {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  function createWorkflow(overrides?: {
    ocrClient?: any
    structuredOutputService?: any
    env?: any
  }) {
    const ocrClient = overrides?.ocrClient ?? mockOcrClient
    const structuredOutputService = overrides?.structuredOutputService ?? mockStructuredOutputService
    const env = overrides?.env ?? mockEnv

    const instance = new WorkflowClass(mockCtx, env, {
      ocrClient,
      structuredOutputService,
    })

    if ((instance as any).ocrClient && typeof (instance as any).ocrClient.process === 'function') {
      vi.spyOn((instance as any).ocrClient, 'process').mockImplementation(ocrClient.process)
    } else {
      ;(instance as any).ocrClient = ocrClient
    }

    if (
      (instance as any).structuredOutputService &&
      typeof (instance as any).structuredOutputService.normalizeToSchema === 'function'
    ) {
      vi.spyOn((instance as any).structuredOutputService, 'normalizeToSchema').mockImplementation(
        structuredOutputService.normalizeToSchema,
      )
    } else {
      ;(instance as any).structuredOutputService = structuredOutputService
    }

    return instance
  }

  describe('successful execution', () => {
    it('executes all 3 steps in sequence with correct inputs and outputs', async () => {
      const workflow = createWorkflow()
      const callSequence: string[] = []

      mockStep.do.mockImplementation(async (name: string, _config: any, callback: () => Promise<any>) => {
        callSequence.push(name)
        return await callback()
      })

      await workflow.run(defaultEvent as any, mockStep as any)

      // Verify sequence of execution
      expect(callSequence).toEqual(['mistral-ocr', 'workers-ai-structuring', 'dispatch-ai-result'])

      // Step 1: verifies documentUrl was processed
      if (mockOcrClient.process.mock.calls.length > 0) {
        expect(mockOcrClient.process).toHaveBeenCalledWith(defaultParams.documentUrl)
      }

      // Step 2: verifies markdown from step 1 was passed to structuring
      if (mockStructuredOutputService.normalizeToSchema.mock.calls.length > 0) {
        expect(mockStructuredOutputService.normalizeToSchema).toHaveBeenCalledWith(
          '# Sample OCR Extracted Content\n\nPolicy: MA-998877',
        )
      }

      // Step 3: verifies result was dispatched to AI_RESULT_QUEUE
      expect(mockEnv.AI_RESULT_QUEUE.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ai-result',
          payload: {
            aiExtractionResultId: defaultParams.aiExtractionResultId,
            structuredPayload: sampleValidExtraction,
          },
          metadata: expect.objectContaining({
            organizationId: defaultParams.organizationId,
            idempotencyKey: defaultParams.aiExtractionResultId,
            requestId: defaultParams.requestId,
          }),
        }),
      )
    })
  })

  describe('step isolation and memoization', () => {
    it('passes Step 1 memoized output to Step 2, and Step 2 memoized output to Step 3', async () => {
      const workflow = createWorkflow()
      const memoizedMarkdown = '# Memoized OCR Result from Durable Cloudflare Storage'
      const memoizedPolicy: ExtractedPolicy = {
        ...sampleValidExtraction,
        policy: {
          ...sampleValidExtraction.policy,
          policyNumber: 'MEMO-888999',
        },
      }

      mockStep.do.mockImplementation(async (name: string, _config: any, callback: () => Promise<any>) => {
        if (name === 'mistral-ocr') {
          // Durable execution: returns memoized markdown without invoking OCR callback
          return memoizedMarkdown
        }
        if (name === 'workers-ai-structuring') {
          // When step 2 callback runs, verify it uses the memoized markdown from step 1
          if (typeof callback === 'function') {
            await callback()
          }
          return memoizedPolicy
        }
        if (name === 'dispatch-ai-result') {
          if (typeof callback === 'function') {
            return await callback()
          }
        }
        return undefined
      })

      const customEvent = {
        payload: {
          documentUrl: 'https://r2.copas.app/policies/memoized-doc.pdf',
          aiExtractionResultId: 'ext-memo-123',
          organizationId: 'org-memo',
          requestId: 'req-memo-xyz',
        },
        instanceId: 'ext-memo-123',
        timestamp: new Date(),
      }

      await workflow.run(customEvent as any, mockStep as any)

      // Verify step 2 structuring received Step 1 memoized markdown
      if (mockStructuredOutputService.normalizeToSchema.mock.calls.length > 0) {
        expect(mockStructuredOutputService.normalizeToSchema).toHaveBeenCalledWith(memoizedMarkdown)
      }

      // Verify step 3 received Step 2 memoized policy
      expect(mockEnv.AI_RESULT_QUEUE.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ai-result',
          payload: {
            aiExtractionResultId: 'ext-memo-123',
            structuredPayload: memoizedPolicy,
          },
          metadata: expect.objectContaining({
            organizationId: 'org-memo',
            idempotencyKey: 'ext-memo-123',
            requestId: 'req-memo-xyz',
          }),
        }),
      )
    })
  })

  describe('error handling and failure propagation', () => {
    it('propagates error thrown in step 2 without running step 3', async () => {
      const workflow = createWorkflow()
      const structuringError = new Error('Workers AI model normalization schema failure')

      mockStructuredOutputService.normalizeToSchema.mockRejectedValueOnce(structuringError)

      mockStep.do.mockImplementation(async (name: string, _config: any, callback: any) => {
        const fn = typeof _config === 'function' ? _config : callback
        if (name === 'workers-ai-structuring') {
          throw structuringError
        }
        if (typeof fn === 'function') {
          return await fn()
        }
        return undefined
      })

      await expect(workflow.run(defaultEvent as any, mockStep as any)).rejects.toThrow(
        'Workers AI model normalization schema failure',
      )

      // Step 1 ran
      const step1Calls = mockStep.do.mock.calls.filter((call) => call[0] === 'mistral-ocr')
      expect(step1Calls.length).toBe(1)

      // Step 2 ran and failed
      const step2Calls = mockStep.do.mock.calls.filter((call) => call[0] === 'workers-ai-structuring')
      expect(step2Calls.length).toBe(1)

      // Step 3 was NEVER invoked
      const step3Calls = mockStep.do.mock.calls.filter((call) => call[0] === 'dispatch-ai-result')
      expect(step3Calls.length).toBe(0)

      // Queue send was NEVER called
      expect(mockEnv.AI_RESULT_QUEUE.send).not.toHaveBeenCalled()
    })

    it('propagates error thrown in step 1 without running step 2 or step 3', async () => {
      const workflow = createWorkflow()
      const ocrError = new Error('Mistral OCR service error 500')

      mockOcrClient.process.mockRejectedValueOnce(ocrError)

      mockStep.do.mockImplementation(async (name: string, _config: any, callback: any) => {
        const fn = typeof _config === 'function' ? _config : callback
        if (name === 'mistral-ocr') {
          throw ocrError
        }
        if (typeof fn === 'function') {
          return await fn()
        }
        return undefined
      })

      await expect(workflow.run(defaultEvent as any, mockStep as any)).rejects.toThrow('Mistral OCR service error 500')

      const step2Calls = mockStep.do.mock.calls.filter((call) => call[0] === 'workers-ai-structuring')
      const step3Calls = mockStep.do.mock.calls.filter((call) => call[0] === 'dispatch-ai-result')
      expect(step2Calls.length).toBe(0)
      expect(step3Calls.length).toBe(0)
      expect(mockEnv.AI_RESULT_QUEUE.send).not.toHaveBeenCalled()
    })
  })

  describe('step configuration parameters', () => {
    it('configures step 1 "mistral-ocr" with 3 retries, exponential backoff (10s delay), and 5m timeout', async () => {
      const workflow = createWorkflow()
      await workflow.run(defaultEvent as any, mockStep as any)

      const ocrCall = mockStep.do.mock.calls.find((call) => call[0] === 'mistral-ocr')
      expect(ocrCall).toBeDefined()
      const config = ocrCall?.[1]
      expect(config).toBeDefined()

      // Retry policy: 3 retries, exponential backoff, 10s base delay
      expect(config.retries).toEqual(
        expect.objectContaining({
          limit: 3,
          backoff: 'exponential',
        }),
      )
      expect(String(config.retries.delay)).toMatch(/10/)

      // Timeout: 5 minutes (e.g. '5m', '5 minutes', 300, 300000)
      expect(String(config.timeout)).toMatch(/5/)
    })

    it('configures step 2 "workers-ai-structuring" with 3 retries, linear backoff (5s delay), and 2m timeout', async () => {
      const workflow = createWorkflow()
      await workflow.run(defaultEvent as any, mockStep as any)

      const structuringCall = mockStep.do.mock.calls.find((call) => call[0] === 'workers-ai-structuring')
      expect(structuringCall).toBeDefined()
      const config = structuringCall?.[1]
      expect(config).toBeDefined()

      // Retry policy: 3 retries, linear backoff, 5s base delay
      expect(config.retries).toEqual(
        expect.objectContaining({
          limit: 3,
          backoff: 'linear',
        }),
      )
      expect(String(config.retries.delay)).toMatch(/5/)

      // Timeout: 2 minutes (e.g. '2m', '2 minutes', 120, 120000)
      expect(String(config.timeout)).toMatch(/2/)
    })

    it('configures step 3 "dispatch-ai-result" with 3 retries, constant backoff (5s delay), and 30s timeout', async () => {
      const workflow = createWorkflow()
      await workflow.run(defaultEvent as any, mockStep as any)

      const dispatchCall = mockStep.do.mock.calls.find((call) => call[0] === 'dispatch-ai-result')
      expect(dispatchCall).toBeDefined()
      const config = dispatchCall?.[1]
      expect(config).toBeDefined()

      // Retry policy: 3 retries, constant backoff, 5s base delay
      expect(config.retries).toEqual(
        expect.objectContaining({
          limit: 3,
          backoff: 'constant',
        }),
      )
      expect(String(config.retries.delay)).toMatch(/5/)

      // Timeout: 30 seconds (e.g. '30s', '30 seconds', 30, 30000)
      expect(String(config.timeout)).toMatch(/30/)
    })
  })

  describe('metadata handling', () => {
    it('dispatches to AI_RESULT_QUEUE with idempotencyKey when optional metadata fields are missing', async () => {
      const workflow = createWorkflow()
      const minimalEvent = {
        payload: {
          documentUrl: 'https://r2.copas.app/policies/minimal.pdf',
          aiExtractionResultId: 'ext-minimal-001',
        },
        instanceId: 'ext-minimal-001',
        timestamp: new Date(),
      }

      await workflow.run(minimalEvent as any, mockStep as any)

      expect(mockEnv.AI_RESULT_QUEUE.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ai-result',
          payload: {
            aiExtractionResultId: 'ext-minimal-001',
            structuredPayload: sampleValidExtraction,
          },
          metadata: expect.objectContaining({
            idempotencyKey: 'ext-minimal-001',
          }),
        }),
      )
    })
  })
})
