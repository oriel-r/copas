import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFilesService } from './files.service'
import { uploadUrlResultSchema, type FilesServiceContract, type StoredFile } from '@copas/contracts'

describe('FilesService', () => {
  let mockBucket: {
    put: ReturnType<typeof vi.fn>
    get: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    head: ReturnType<typeof vi.fn>
    list: ReturnType<typeof vi.fn>
  }
  let s3Config: {
    accountId: string
    accessKeyId: string
    secretAccessKey: string
    bucketName: string
    publicUrl?: string
  }

  beforeEach(() => {
    mockBucket = {
      put: vi.fn().mockResolvedValue({}),
      get: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
      head: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue({ objects: [] }),
    }

    s3Config = {
      accountId: 'account-123456789',
      accessKeyId: 'r2-access-key-id',
      secretAccessKey: 'r2-secret-access-key-very-secure',
      bucketName: 'copas-documents',
      publicUrl: 'https://documents.copas.example.com',
    }
  })

  const instantiateService = (customConfig?: Record<string, any>): FilesServiceContract => {
    const config = {
      bucket: mockBucket as any,
      ...s3Config,
      ...customConfig,
      config: {
        ...s3Config,
        ...customConfig,
      },
    }
    return createFilesService(config as any)
  }

  describe('Contract and Interface', () => {
    it('should implement all methods required by FilesServiceContract', () => {
      const service = instantiateService()
      expect(typeof service.upload).toBe('function')
      expect(typeof service.get).toBe('function')
      expect(typeof service.delete).toBe('function')
      expect(typeof service.generateUploadUrl).toBe('function')
      expect(typeof service.generateTemporaryPublicUrl).toBe('function')
    })
  })

  describe('upload', () => {
    it('should upload ArrayBuffer binary data and call bucket.put with key and contentType header', async () => {
      const service = instantiateService()
      const data = new TextEncoder().encode('%PDF-1.4 test binary data').buffer
      const key = 'org-1/uuid-test-doc.pdf'
      const options = { contentType: 'application/pdf' }

      await service.upload(key, data, options)

      expect(mockBucket.put).toHaveBeenCalledWith(
        key,
        data,
        expect.objectContaining({
          httpMetadata: expect.objectContaining({ contentType: 'application/pdf' }),
        }),
      )
    })

    it('should upload ReadableStream data without options', async () => {
      const service = instantiateService()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('stream chunk'))
          controller.close()
        },
      })
      const key = 'org-1/stream-file.pdf'

      await service.upload(key, stream)

      expect(mockBucket.put).toHaveBeenCalledWith(key, stream, expect.anything())
    })

    it('should reject when key is empty or invalid', async () => {
      const service = instantiateService()
      const data = new ArrayBuffer(8)

      await expect(service.upload('', data)).rejects.toThrow()
    })

    it('should propagate rejection when bucket.put throws an error', async () => {
      const service = instantiateService()
      mockBucket.put.mockRejectedValueOnce(new Error('R2 Storage quota exceeded'))
      const data = new ArrayBuffer(8)

      await expect(
        service.upload('org-1/error-file.pdf', data, { contentType: 'application/pdf' }),
      ).rejects.toThrow('R2 Storage quota exceeded')
    })
  })

  describe('get', () => {
    it('should retrieve stored file stream and metadata when object exists in bucket', async () => {
      const service = instantiateService()
      const key = 'org-1/existing-doc.pdf'
      const mockStream = new ReadableStream()
      const r2Object = {
        body: mockStream,
        httpMetadata: { contentType: 'application/pdf' },
        httpEtag: '"mock-etag-12345"',
      }
      mockBucket.get.mockResolvedValueOnce(r2Object)

      const result = await service.get(key)

      expect(mockBucket.get).toHaveBeenCalledWith(key)
      expect(result).not.toBeNull()
      expect(result).toEqual<StoredFile>({
        body: mockStream,
        contentType: 'application/pdf',
        httpEtag: '"mock-etag-12345"',
      })
    })

    it('should return null when object does not exist in bucket', async () => {
      const service = instantiateService()
      mockBucket.get.mockResolvedValueOnce(null)

      const result = await service.get('org-1/non-existent.pdf')

      expect(mockBucket.get).toHaveBeenCalledWith('org-1/non-existent.pdf')
      expect(result).toBeNull()
    })

    it('should reject when key is empty', async () => {
      const service = instantiateService()
      await expect(service.get('')).rejects.toThrow()
    })

    it('should propagate rejection when bucket.get fails', async () => {
      const service = instantiateService()
      mockBucket.get.mockRejectedValueOnce(new Error('Bucket connection error'))

      await expect(service.get('org-1/faulty.pdf')).rejects.toThrow('Bucket connection error')
    })
  })

  describe('delete', () => {
    it('should delete object from bucket by key', async () => {
      const service = instantiateService()
      const key = 'org-1/doc-to-delete.pdf'

      await service.delete(key)

      expect(mockBucket.delete).toHaveBeenCalledWith(key)
    })

    it('should reject when key is empty', async () => {
      const service = instantiateService()
      await expect(service.delete('')).rejects.toThrow()
    })

    it('should propagate rejection when bucket.delete fails', async () => {
      const service = instantiateService()
      mockBucket.delete.mockRejectedValueOnce(new Error('R2 delete failed'))

      await expect(service.delete('org-1/fail.pdf')).rejects.toThrow('R2 delete failed')
    })
  })

  describe('generateUploadUrl', () => {
    it('should generate valid upload URL and policyAssetKey matching {organizationId}/{uuid}-{filename}', async () => {
      const service = instantiateService()
      const organizationId = '018f9e2b-1111-7000-8000-000000000001'
      const filename = 'poliza_auto.pdf'
      const expiresInSeconds = 600

      const result = await service.generateUploadUrl(filename, organizationId, expiresInSeconds)

      // Validate according to contract schema
      const parsed = uploadUrlResultSchema.parse(result)
      expect(parsed.uploadUrl).toBeDefined()
      expect(typeof parsed.uploadUrl).toBe('string')
      expect(parsed.uploadUrl.length).toBeGreaterThan(0)

      // Key must format as {organizationId}/{uuid}-{filename}
      expect(parsed.policyAssetKey).toMatch(
        new RegExp(`^${organizationId}/[0-9a-fA-F-]+_${filename}$|^${organizationId}/[0-9a-fA-F-]+-${filename}$`),
      )
    })

    it('should use default expiration when expiresInSeconds is omitted', async () => {
      const service = instantiateService()
      const result = await service.generateUploadUrl('doc.pdf', 'org-123')

      expect(uploadUrlResultSchema.safeParse(result).success).toBe(true)
      expect(result.policyAssetKey).toContain('org-123/')
      expect(result.policyAssetKey).toContain('doc.pdf')
    })

    it('should reject when filename or organizationId is missing or empty', async () => {
      const service = instantiateService()

      await expect(service.generateUploadUrl('', 'org-123')).rejects.toThrow()
      await expect(service.generateUploadUrl('file.pdf', '')).rejects.toThrow()
    })

    it('should reject when expiresInSeconds is <= 0', async () => {
      const service = instantiateService()

      await expect(service.generateUploadUrl('file.pdf', 'org-123', 0)).rejects.toThrow()
      await expect(service.generateUploadUrl('file.pdf', 'org-123', -60)).rejects.toThrow()
    })
  })

  describe('generateTemporaryPublicUrl', () => {
    describe('Case 1: Configured with R2 / S3 credentials (AWS SigV4)', () => {
      it('should generate presigned URL pointing to r2.cloudflarestorage.com with bucket, key, and SigV4 query params', async () => {
        const service = instantiateService()
        const key = 'org-1/uuid-document.pdf'
        const expiresInSeconds = 300

        const urlString = await service.generateTemporaryPublicUrl(key, expiresInSeconds)

        expect(typeof urlString).toBe('string')
        const url = new URL(urlString)

        // Verifies host contains r2.cloudflarestorage.com
        expect(url.hostname).toContain('r2.cloudflarestorage.com')

        // Verifies pathname contains key (and bucket if path-style)
        expect(decodeURIComponent(url.pathname)).toContain(key)

        // Verifies AWS SigV4 query parameters
        expect(url.searchParams.has('X-Amz-Signature')).toBe(true)
        expect(url.searchParams.has('X-Amz-Algorithm')).toBe(true)
        expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256')
        expect(url.searchParams.has('X-Amz-Credential')).toBe(true)
        expect(url.searchParams.has('X-Amz-Date')).toBe(true)
        expect(url.searchParams.get('X-Amz-Expires')).toBe('300')
      })

      it('should respect custom expiresInSeconds parameter in SigV4 URL', async () => {
        const service = instantiateService()
        const key = 'org-1/test-custom-ttl.pdf'
        const customTtl = 900

        const urlString = await service.generateTemporaryPublicUrl(key, customTtl)
        const url = new URL(urlString)

        expect(url.searchParams.get('X-Amz-Expires')).toBe('900')
      })
    })

    describe('Case 2: Local / Fallback mode without S3 credentials', () => {
      it('should generate signed fallback URL with token or expiration parameter when S3 credentials are not set', async () => {
        // Without S3 credentials
        const service = instantiateService({
          accountId: undefined,
          accessKeyId: undefined,
          secretAccessKey: undefined,
        })
        const key = 'org-fallback/local-doc.pdf'
        const expiresInSeconds = 300

        const urlString = await service.generateTemporaryPublicUrl(key, expiresInSeconds)

        expect(typeof urlString).toBe('string')
        expect(urlString.length).toBeGreaterThan(0)
        expect(urlString).toContain(encodeURIComponent(key).replace(/%2F/g, '/'))

        const url = new URL(urlString)
        // Must contain token, expires, or signature query param for accessibility
        const hasAuthParam =
          url.searchParams.has('token') ||
          url.searchParams.has('expires') ||
          url.searchParams.has('signature') ||
          url.searchParams.has('exp') ||
          url.searchParams.has('sig')
        expect(hasAuthParam).toBe(true)
      })
    })

    describe('Edge Cases and Error Handling', () => {
      it('should reject when key is empty string', async () => {
        const service = instantiateService()
        await expect(service.generateTemporaryPublicUrl('', 300)).rejects.toThrow()
      })

      it('should reject when expiresInSeconds is <= 0', async () => {
        const service = instantiateService()
        await expect(service.generateTemporaryPublicUrl('org-1/doc.pdf', 0)).rejects.toThrow()
        await expect(service.generateTemporaryPublicUrl('org-1/doc.pdf', -100)).rejects.toThrow()
      })
    })
  })
})
