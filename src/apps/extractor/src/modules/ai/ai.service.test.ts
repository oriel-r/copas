import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAiService } from './ai.service'
import type { ExtractedPolicy } from '@copas/contracts'

describe('extractor: ai.service', () => {
  let mockOcrClient: any
  let mockLlmClient: any
  let aiService: ReturnType<typeof createAiService>

  beforeEach(() => {
    mockOcrClient = {
      process: vi.fn(),
    }
    mockLlmClient = {
      generateStructured: vi.fn(),
    }
    aiService = createAiService({
      ocrClient: mockOcrClient,
      llmClient: mockLlmClient,
    })
  })

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

  describe('extractPolicy', () => {
    it('should orchestrate OCR and LLM to return validated ExtractedPolicy', async () => {
      const documentUrl = 'https://r2.copas.app/policies/doc-123.pdf'
      const ocrMarkdown = '# POLIZA MERCANTIL ANDINA\n\nNumero: MA-998877\nAsegurado: ROBERTO CARLOS...'
      
      mockOcrClient.process.mockResolvedValueOnce(ocrMarkdown)
      mockLlmClient.generateStructured.mockResolvedValueOnce(sampleValidExtraction)

      const result = await aiService.extractPolicy(documentUrl)

      expect(mockOcrClient.process).toHaveBeenCalledWith(documentUrl)
      expect(mockLlmClient.generateStructured).toHaveBeenCalledWith(
        expect.objectContaining({ markdown: ocrMarkdown }),
      )
      expect(result).toEqual(sampleValidExtraction)
    })

    it('should throw error when OCR client fails', async () => {
      mockOcrClient.process.mockRejectedValueOnce(new Error('OCR Service Unavailable'))

      await expect(
        aiService.extractPolicy('https://r2.copas.app/policies/error.pdf'),
      ).rejects.toThrow('OCR Service Unavailable')

      expect(mockLlmClient.generateStructured).not.toHaveBeenCalled()
    })

    it('should throw error when LLM returns invalid JSON or fails schema validation', async () => {
      mockOcrClient.process.mockResolvedValueOnce('Some markdown text')
      // Invalid payload: currency is 'USD' instead of 'ARS', and invalid branch code
      const invalidLlmOutput = {
        ...sampleValidExtraction,
        policy: {
          ...sampleValidExtraction.policy,
          currency: 'USD',
        },
      }
      mockLlmClient.generateStructured.mockResolvedValueOnce(invalidLlmOutput)

      await expect(
        aiService.extractPolicy('https://r2.copas.app/policies/invalid.pdf'),
      ).rejects.toThrow()
    })

    it('should validate and accept minimal payload with empty strings and nulls where allowed', async () => {
      const minimalValid: ExtractedPolicy = {
        company: { name: 'FEDERACION PATRONAL', code: '' },
        branch: { code: 'HOME' },
        policy: {
          policyNumber: 'FP-001',
          premiumTotal: null,
          currency: 'ARS',
          startDate: '2026-01-01',
          endDate: '2027-01-01',
          billingFrequency: 'single_payment',
        },
        insured: {
          fullName: 'ANA GOMEZ',
          cuit: '',
          email: '',
          phone: '',
          birthDate: '',
        },
        assetType: { code: 'HOME' },
        asset: { properties: { UBICACION: 'CORRIENTES 1234' } },
        paymentMethod: { code: 'PAGO_MANUAL' },
        coverages: [],
        installments: [
          { installmentNumber: 1, dueDate: '2026-01-01', totalAmount: 50000 },
        ],
      }

      mockOcrClient.process.mockResolvedValueOnce('Markdown for Home Policy')
      mockLlmClient.generateStructured.mockResolvedValueOnce(minimalValid)

      const result = await aiService.extractPolicy('https://r2.copas.app/policies/home.pdf')
      expect(result).toEqual(minimalValid)
    })

    it('should support OCR response as an object with markdown property', async () => {
      mockOcrClient.process.mockResolvedValueOnce({ markdown: '# OCR Markdown Object' })
      mockLlmClient.generateStructured.mockResolvedValueOnce(sampleValidExtraction)

      const result = await aiService.extractPolicy('https://r2.copas.app/policies/doc-md.pdf')
      expect(result).toEqual(sampleValidExtraction)
      expect(mockLlmClient.generateStructured).toHaveBeenCalledWith(
        expect.objectContaining({ markdown: '# OCR Markdown Object' }),
      )
    })

    it('should support OCR response as an object with text property', async () => {
      mockOcrClient.process.mockResolvedValueOnce({ text: '# OCR Text Object' })
      mockLlmClient.generateStructured.mockResolvedValueOnce(sampleValidExtraction)

      const result = await aiService.extractPolicy('https://r2.copas.app/policies/doc-text.pdf')
      expect(result).toEqual(sampleValidExtraction)
      expect(mockLlmClient.generateStructured).toHaveBeenCalledWith(
        expect.objectContaining({ markdown: '# OCR Text Object' }),
      )
    })

    it('should support LLM response wrapped in markdown json code block', async () => {
      mockOcrClient.process.mockResolvedValueOnce('OCR Content')
      const jsonMarkdown = `\`\`\`json\n${JSON.stringify(sampleValidExtraction)}\n\`\`\``
      mockLlmClient.generateStructured.mockResolvedValueOnce(jsonMarkdown)

      const result = await aiService.extractPolicy('https://r2.copas.app/policies/doc-markdown-fence.pdf')
      expect(result).toEqual(sampleValidExtraction)
    })

    it('should support LLM response wrapped in code block without json tag', async () => {
      mockOcrClient.process.mockResolvedValueOnce('OCR Content')
      const codeBlock = `\`\`\`\n${JSON.stringify(sampleValidExtraction)}\n\`\`\``
      mockLlmClient.generateStructured.mockResolvedValueOnce(codeBlock)

      const result = await aiService.extractPolicy('https://r2.copas.app/policies/doc-codeblock.pdf')
      expect(result).toEqual(sampleValidExtraction)
    })

    it('should support LLM response as raw JSON string', async () => {
      mockOcrClient.process.mockResolvedValueOnce('OCR Content')
      mockLlmClient.generateStructured.mockResolvedValueOnce(JSON.stringify(sampleValidExtraction))

      const result = await aiService.extractPolicy('https://r2.copas.app/policies/doc-rawjson.pdf')
      expect(result).toEqual(sampleValidExtraction)
    })
  })


  describe('createAiService constructor variations', () => {
    it('supports dependencies object with aiResultQueue', async () => {
      const mockQueue = { send: vi.fn().mockResolvedValue(undefined) }
      const service = createAiService({
        ocrClient: mockOcrClient,
        llmClient: mockLlmClient,
        aiResultQueue: mockQueue as any,
      })

      mockOcrClient.process.mockResolvedValueOnce('OCR text')
      mockLlmClient.generateStructured.mockResolvedValueOnce(sampleValidExtraction)

      const result = await (service as any).processDocument({
        documentUrl: 'https://r2.copas.app/policies/doc.pdf',
        aiExtractionResultId: 'ext-123',
        organizationId: 'org-abc',
      })

      expect(result).toEqual(sampleValidExtraction)
      expect(mockQueue.send).toHaveBeenCalledWith({
        type: 'ai-result',
        payload: {
          aiExtractionResultId: 'ext-123',
          structuredPayload: sampleValidExtraction,
        },
        metadata: {
          organizationId: 'org-abc',
          idempotencyKey: 'ext-123',
        },
      })
    })

    it('handles default empty constructor without arguments', () => {
      const service = createAiService()
      expect(service).toBeDefined()
      expect(typeof service.extractPolicy).toBe('function')
    })
  })

  describe('processDocument', () => {
    it('falls back to tenantId when organizationId is not present in payload', async () => {
      const mockQueue = { send: vi.fn().mockResolvedValue(undefined) }
      const service = createAiService({
        ocrClient: mockOcrClient,
        llmClient: mockLlmClient,
        aiResultQueue: mockQueue as any,
      })

      mockOcrClient.process.mockResolvedValueOnce('OCR text')
      mockLlmClient.generateStructured.mockResolvedValueOnce(sampleValidExtraction)

      await (service as any).processDocument({
        documentUrl: 'https://r2.copas.app/policies/doc.pdf',
        aiExtractionResultId: 'ext-456',
        tenantId: 'tenant-xyz',
      })

      expect(mockQueue.send).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            organizationId: 'tenant-xyz',
            idempotencyKey: 'ext-456',
          }),
        }),
      )
    })

    it('falls back to "default" when neither organizationId nor tenantId is provided', async () => {
      const mockQueue = { send: vi.fn().mockResolvedValue(undefined) }
      const service = createAiService({
        ocrClient: mockOcrClient,
        llmClient: mockLlmClient,
        aiResultQueue: mockQueue as any,
      })

      mockOcrClient.process.mockResolvedValueOnce('OCR text')
      mockLlmClient.generateStructured.mockResolvedValueOnce(sampleValidExtraction)

      await (service as any).processDocument({
        documentUrl: 'https://r2.copas.app/policies/doc.pdf',
        aiExtractionResultId: 'ext-789',
      })

      expect(mockQueue.send).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            organizationId: 'default',
            idempotencyKey: 'ext-789',
          }),
        }),
      )
    })

    it('processes document successfully without queue when aiResultQueue is null or has no send method', async () => {
      const service = createAiService({
        ocrClient: mockOcrClient,
        llmClient: mockLlmClient,
        aiResultQueue: null as any,
      })

      mockOcrClient.process.mockResolvedValueOnce('OCR text')
      mockLlmClient.generateStructured.mockResolvedValueOnce(sampleValidExtraction)

      const result = await (service as any).processDocument({
        documentUrl: 'https://r2.copas.app/policies/doc.pdf',
        aiExtractionResultId: 'ext-noqueue',
      })

      expect(result).toEqual(sampleValidExtraction)
    })
  })
})

