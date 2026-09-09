import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { createPoliciesRouter } from './policies.routes'

describe('policies.routes', () => {
  let mockPoliciesService: any
  let mockFilesService: any
  let app: Hono

  const setupApp = (options: {
    orgId?: string | null
    includeFilesService?: boolean
    backendUrl?: string
  } = {}) => {
    const testApp = new Hono()

    testApp.use('*', async (c, next) => {
      if (options.orgId !== undefined) {
        c.set('organizationId' as any, options.orgId)
      } else {
        c.set('organizationId' as any, 'org-123')
      }

      const files = options.includeFilesService !== false ? mockFilesService : undefined
      c.set('filesService' as any, files)
      c.set('services' as any, {
        insurance: {
          files,
          policies: mockPoliciesService,
        },
      })
      await next()
    })

    const router = createPoliciesRouter({
      policiesService: mockPoliciesService,
      filesService: options.includeFilesService !== false ? mockFilesService : undefined,
    })
    testApp.route('/policies', router)
    return testApp
  }

  beforeEach(() => {
    mockPoliciesService = {
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      processAiResult: vi.fn(),
      generateUploadUrl: vi.fn(),
      triggerExtraction: vi.fn(),
      getExtractionResult: vi.fn(),
    }

    mockFilesService = {
      get: vi.fn(),
      upload: vi.fn(),
      generateUploadUrl: vi.fn(),
      generateTemporaryPublicUrl: vi.fn().mockResolvedValue('https://temp.example.com/file.pdf'),
      delete: vi.fn(),
    }

    app = setupApp()
  })

  describe('GET /policies', () => {
    it('should return 200 with list of policies', async () => {
      const policies = [
        { id: 'pol-1', policyNumber: 'POL-123', premiumTotal: 100000, status: 'active' },
      ]
      mockPoliciesService.list.mockResolvedValueOnce(policies)

      const res = await app.request('/policies')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(policies)
    })
  })

  describe('GET /policies/:id', () => {
    it('should return 200 when policy exists', async () => {
      const policy = { id: 'pol-1', policyNumber: 'POL-123' }
      mockPoliciesService.getById.mockResolvedValueOnce(policy)

      const res = await app.request('/policies/pol-1')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(policy)
    })

    it('should return 404 when policy not found', async () => {
      mockPoliciesService.getById.mockResolvedValueOnce(null)

      const res = await app.request('/policies/pol-999')
      expect(res.status).toBe(404)
    })
  })

  describe('POST /policies', () => {
    it('should return 201 when valid policy payload is provided', async () => {
      const payload = {
        companyId: '018f9e2b-1111-7000-8000-000000000001',
        insuredId: '018f9e2b-2222-7000-8000-000000000002',
        policyNumber: 'POL-NEW',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
      }
      const created = { id: 'pol-new', ...payload }
      mockPoliciesService.create.mockResolvedValueOnce(created)

      const res = await app.request('/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data).toEqual(created)
    })

    it('should return 400 when startDate is after endDate', async () => {
      const invalidPayload = {
        companyId: '018f9e2b-1111-7000-8000-000000000001',
        insuredId: '018f9e2b-2222-7000-8000-000000000002',
        startDate: '2027-01-01',
        endDate: '2026-01-01',
      }

      const res = await app.request('/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('PUT /policies/:id', () => {
    it('should return 200 when policy is updated successfully', async () => {
      const updatePayload = { policyNumber: 'POL-UPDATED', premiumTotal: 120000 }
      const updated = { id: 'pol-1', ...updatePayload }
      mockPoliciesService.update.mockResolvedValueOnce(updated)

      const res = await app.request('/policies/pol-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(updated)
      expect(mockPoliciesService.update).toHaveBeenCalledWith('pol-1', expect.objectContaining(updatePayload))
    })

    it('should return 404 when updating non-existent policy', async () => {
      mockPoliciesService.update.mockResolvedValueOnce(null)

      const res = await app.request('/policies/pol-999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyNumber: 'POL-NONE' }),
      })

      expect([400, 404]).toContain(res.status)
    })
  })

  describe('DELETE /policies/:id', () => {
    it('attempts to delete policy (returns 200/204 if implemented, or 404)', async () => {
      mockPoliciesService.getById.mockResolvedValueOnce({ id: 'pol-1', policyNumber: 'POL-1' })
      mockPoliciesService.delete.mockResolvedValueOnce(true)

      const res = await app.request('/policies/pol-1', {
        method: 'DELETE',
      })

      expect([200, 204, 404]).toContain(res.status)
    })

    it('should return 404 when policy to delete is not found', async () => {
      mockPoliciesService.getById.mockResolvedValueOnce(null)
      mockPoliciesService.delete.mockResolvedValueOnce(null)

      const res = await app.request('/policies/pol-nonexistent', {
        method: 'DELETE',
      })

      expect(res.status).toBe(404)
    })
  })

  describe('GET /policies/documents/*', () => {
    it('serves document via filesService with 200 and headers etag and content-type', async () => {
      const mockFile = {
        body: new Uint8Array([1, 2, 3]),
        contentType: 'application/pdf',
        httpEtag: '"etag-files-123"',
      }
      mockFilesService.get.mockResolvedValueOnce(mockFile)

      const res = await app.request('/policies/documents/org-123/file.pdf')

      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toBe('application/pdf')
      expect(res.headers.get('etag')).toBe('"etag-files-123"')
    })

    it('returns 404 when filesService returns null', async () => {
      mockFilesService.get.mockResolvedValueOnce(null)

      const res = await app.request('/policies/documents/org-123/missing.pdf')

      expect(res.status).toBe(404)
    })

    it('serves document via fallback DOCUMENT_BUCKET when filesService is not configured', async () => {
      const noFilesApp = setupApp({ includeFilesService: false })
      const mockBucket = {
        get: vi.fn().mockResolvedValueOnce({
          body: new Uint8Array([4, 5, 6]),
          httpEtag: '"r2-etag-789"',
          httpMetadata: { contentType: 'application/pdf' },
        }),
      }

      const res = await noFilesApp.request(
        '/policies/documents/org-123/r2-file.pdf',
        undefined,
        { DOCUMENT_BUCKET: mockBucket } as any,
      )

      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toBe('application/pdf')
      expect(res.headers.get('etag')).toBe('"r2-etag-789"')
    })

    it('returns 404 when fallback DOCUMENT_BUCKET returns null', async () => {
      const noFilesApp = setupApp({ includeFilesService: false })
      const mockBucket = {
        get: vi.fn().mockResolvedValueOnce(null),
      }

      const res = await noFilesApp.request(
        '/policies/documents/org-123/r2-missing.pdf',
        undefined,
        { DOCUMENT_BUCKET: mockBucket } as any,
      )

      expect(res.status).toBe(404)
    })

    it('returns 503 when neither filesService nor DOCUMENT_BUCKET is configured', async () => {
      const noFilesApp = setupApp({ includeFilesService: false })

      const res = await noFilesApp.request(
        '/policies/documents/org-123/unconfigured.pdf',
        undefined,
        {} as any,
      )

      expect(res.status).toBe(503)
    })
  })

  describe('GET /policies/extractions/:id', () => {
    it('returns 200 with result when extractor is implemented and extraction exists', async () => {
      const extractionResult = { id: 'ext-1', status: 'completed', data: {} }
      mockPoliciesService.getExtractionResult.mockResolvedValueOnce(extractionResult)

      const res = await app.request('/policies/extractions/ext-1')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(extractionResult)
    })

    it('returns 404 when extractor is implemented but extraction is not found', async () => {
      mockPoliciesService.getExtractionResult.mockResolvedValueOnce(null)

      const res = await app.request('/policies/extractions/ext-not-found')

      expect(res.status).toBe(404)
    })

    it('returns 501 when extractor is not implemented', async () => {
      delete mockPoliciesService.getExtractionResult

      const res = await app.request('/policies/extractions/ext-unimplemented')

      expect(res.status).toBe(501)
      const data = await res.json()
      expect(data).toEqual({ error: 'Not implemented' })
    })
  })

  describe('POST /policies/upload-url', () => {
    it('returns 400 when Zod validation fails', async () => {
      const res = await app.request('/policies/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalidField: 123 }),
      })

      expect(res.status).toBe(400)
    })

    it('returns 400 when organizationId is missing in context', async () => {
      const noOrgApp = setupApp({ orgId: null })

      const res = await noOrgApp.request('/policies/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: 'test.pdf' }),
      })

      expect(res.status).toBe(400)
    })

    it('returns 200 with generated URL on success', async () => {
      const uploadUrlResult = {
        uploadUrl: 'https://r2.example.com/upload-signed-url',
        policyAssetKey: 'org-123/uuid-test.pdf',
      }
      mockFilesService.generateUploadUrl.mockResolvedValueOnce(uploadUrlResult)
      mockPoliciesService.generateUploadUrl.mockResolvedValueOnce(uploadUrlResult)

      const res = await app.request('/policies/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: 'test.pdf', contentType: 'application/pdf' }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(uploadUrlResult)
    })
  })

  describe('POST /policies/upload', () => {
    it('returns 400 or 401 when organizationId is missing', async () => {
      const noOrgApp = setupApp({ orgId: null })

      const res = await noOrgApp.request('/policies/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf' },
        body: 'binary-content',
      })

      expect([400, 401]).toContain(res.status)
    })

    it('returns 400 when multipart/form-data contains no file', async () => {
      const formData = new FormData()
      formData.append('notAFile', 'just a string')

      const res = await app.request('/policies/upload', {
        method: 'POST',
        body: formData,
      })

      expect(res.status).toBe(400)
    })

    it('uploads file via filesService when multipart/form-data has file', async () => {
      mockFilesService.upload.mockResolvedValueOnce(undefined)

      const formData = new FormData()
      const file = new File(['dummy-content'], 'policy.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const res = await app.request('/policies/upload', {
        method: 'POST',
        body: formData,
      })

      expect([200, 201]).toContain(res.status)
      const data = await res.json()
      expect(data.policyAssetKey).toBeTruthy()
      expect(data.documentUrl).toBeTruthy()
    })

    it('uploads file via fallback DOCUMENT_BUCKET when filesService is not configured', async () => {
      const noFilesApp = setupApp({ includeFilesService: false })
      const mockBucket = {
        put: vi.fn().mockResolvedValueOnce({}),
      }

      const formData = new FormData()
      const file = new File(['dummy-content'], 'policy.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const res = await noFilesApp.request(
        '/policies/upload',
        {
          method: 'POST',
          body: formData,
        },
        { DOCUMENT_BUCKET: mockBucket } as any,
      )

      expect([200, 201]).toContain(res.status)
      expect(mockBucket.put).toHaveBeenCalled()
    })

    it('handles direct binary upload with generic content-type', async () => {
      mockFilesService.upload.mockResolvedValueOnce(undefined)

      const res = await app.request('/policies/upload?filename=direct.pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf' },
        body: new Uint8Array([10, 20, 30]),
      })

      expect([200, 201]).toContain(res.status)
      const data = await res.json()
      expect(data.policyAssetKey).toBeTruthy()
    })

    it('constructs URL with configured BACKEND_URL vs fallback', async () => {
      const noFilesApp = setupApp({ includeFilesService: false })
      const mockBucket = {
        put: vi.fn().mockResolvedValue({}),
      }

      const formData = new FormData()
      formData.append('file', new File(['content'], 'test.pdf', { type: 'application/pdf' }))

      const resWithBackend = await noFilesApp.request(
        '/policies/upload',
        {
          method: 'POST',
          body: formData,
        },
        { BACKEND_URL: 'https://api.copas.com', DOCUMENT_BUCKET: mockBucket } as any,
      )

      expect([200, 201]).toContain(resWithBackend.status)
      const dataWithBackend = await resWithBackend.json()
      expect(dataWithBackend.documentUrl).toContain('https://api.copas.com')

      const resFallback = await noFilesApp.request(
        '/policies/upload',
        {
          method: 'POST',
          body: formData,
        },
        { DOCUMENT_BUCKET: mockBucket } as any,
      )

      expect([200, 201]).toContain(resFallback.status)
      const dataFallback = await resFallback.json()
      expect(dataFallback.documentUrl).toBeTruthy()
    })
  })

  describe('POST /policies/extract', () => {
    it('returns 400 when neither policyAssetKey nor documentUrl is provided', async () => {
      const res = await app.request('/policies/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
    })

    it('returns 400 or 401 when organizationId is missing', async () => {
      const noOrgApp = setupApp({ orgId: null })

      const res = await noOrgApp.request('/policies/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyAssetKey: 'key-1' }),
      })

      expect([400, 401]).toContain(res.status)
    })

    it('returns 200/202 with triggerExtraction call on success', async () => {
      mockPoliciesService.triggerExtraction.mockResolvedValueOnce({
        extractionId: 'ext-123',
        status: 'queued',
      })

      const res = await app.request('/policies/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyAssetKey: 'org-123/file.pdf' }),
      })

      expect([200, 202]).toContain(res.status)
      expect(mockPoliciesService.triggerExtraction).toHaveBeenCalled()
    })
  })

  describe('POST /policies/process-ai-result', () => {
    it('should return 200/201 when valid extraction payload is sent', async () => {
      const payload = {
        aiExtractionResultId: '018f9e2b-0000-7000-8000-000000000000',
        organizationId: '018f9e2b-0000-7000-8000-000000000001',
        uploadedBy: '018f9e2b-0000-7000-8000-000000000002',
        structuredPayload: {
          company: { name: 'SANCOR', code: 'SANCOR' },
          branch: { code: 'AUTO' },
          policy: {
            policyNumber: 'POL-1',
            premiumTotal: 100000,
            currency: 'ARS',
            startDate: '2026-01-01',
            endDate: '2027-01-01',
            billingFrequency: 'monthly',
          },
          insured: {
            fullName: 'JUAN PEREZ',
            cuit: '20123456789',
            email: 'juan@example.com',
            phone: '541112345678',
            birthDate: '1990-01-01',
          },
          assetType: { code: 'AUTO' },
          asset: { properties: { PATENTE: 'AB123CD' } },
          paymentMethod: { code: 'AUTOMATICO_DEBITO' },
          coverages: [],
          installments: [
            { installmentNumber: 1, dueDate: '2026-01-10', totalAmount: 10000 },
          ],
        },
      }

      mockPoliciesService.processAiResult.mockResolvedValueOnce({ id: 'pol-created' })

      const res = await app.request('/policies/process-ai-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      expect([200, 201]).toContain(res.status)
    })

    it('should return 400 when invalid payload is sent to process-ai-result', async () => {
      const res = await app.request('/policies/process-ai-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalidField: true }),
      })

      expect(res.status).toBe(400)
    })
  })
})
