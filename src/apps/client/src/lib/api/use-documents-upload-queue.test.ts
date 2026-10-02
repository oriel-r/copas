import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDocumentsUploadQueue } from './use-documents-upload-queue'

describe('useDocumentsUploadQueue', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      if (urlStr.includes('/upload-url')) {
        return new Response(
          JSON.stringify({
            uploadUrl: 'https://r2.storage.example.com/signed-put-target',
            policyAssetKey: 'org-test/uuid-doc.pdf',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (urlStr.includes('signed-put-target') || (init && init.method === 'PUT')) {
        return new Response(null, { status: 200 })
      }

      if (urlStr.includes('/extract')) {
        return new Response(
          JSON.stringify({ extractionId: 'ext-123', status: 'queued' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const getQueue = (result: { current: any }) => {
    return result.current.items ?? result.current.queue ?? []
  }

  it('should initialize with an empty queue', () => {
    const { result } = renderHook(() => useDocumentsUploadQueue())
    expect(getQueue(result)).toEqual([])
  })

  it('should enqueue multiple files when enqueueFiles is called', async () => {
    const { result } = renderHook(() => useDocumentsUploadQueue())

    const file1 = new File(['content-1'], 'poliza_1.pdf', { type: 'application/pdf' })
    const file2 = new File(['content-2'], 'poliza_2.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.enqueueFiles([file1, file2])
    })

    const queue = getQueue(result)
    expect(queue).toHaveLength(2)
    expect(queue[0].file.name).toBe('poliza_1.pdf')
    expect(queue[1].file.name).toBe('poliza_2.pdf')
  })

  it('should immediately set status to "error" with descriptive message for non-PDF files', () => {
    const { result } = renderHook(() => useDocumentsUploadQueue())

    const imageFile = new File(['image-content'], 'foto_auto.jpg', { type: 'image/jpeg' })
    const wordFile = new File(['word-content'], 'contrato.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    act(() => {
      result.current.enqueueFiles([imageFile, wordFile])
    })

    const queue = getQueue(result)
    expect(queue).toHaveLength(2)

    expect(queue[0].status).toBe('error')
    expect(queue[0].error).toBeDefined()
    expect(typeof queue[0].error).toBe('string')
    expect(queue[0].error.length).toBeGreaterThan(0)

    expect(queue[1].status).toBe('error')
    expect(queue[1].error).toBeDefined()
    expect(typeof queue[1].error).toBe('string')
    expect(queue[1].error.length).toBeGreaterThan(0)

    // No upload should be triggered for invalid files
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('should immediately set status to "error" with descriptive message for files exceeding 15MB', () => {
    const { result } = renderHook(() => useDocumentsUploadQueue())

    // 15MB + 1 byte
    const largeFile = new File([new Uint8Array(15 * 1024 * 1024 + 1)], 'poliza_enorme.pdf', {
      type: 'application/pdf',
    })

    act(() => {
      result.current.enqueueFiles([largeFile])
    })

    const queue = getQueue(result)
    expect(queue).toHaveLength(1)
    expect(queue[0].status).toBe('error')
    expect(queue[0].error).toBeDefined()
    expect(typeof queue[0].error).toBe('string')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('should limit concurrency to a maximum of 3 files uploading simultaneously', async () => {
    // Create deferred promises for controlling in-flight uploads
    let resolvers: Array<() => void> = []

    fetchMock.mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      if (urlStr.includes('/upload-url')) {
        return new Response(
          JSON.stringify({
            uploadUrl: 'https://r2.storage.example.com/signed-put-target',
            policyAssetKey: 'org-test/uuid-doc.pdf',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (urlStr.includes('signed-put-target') || (init && init.method === 'PUT')) {
        // Hang until resolver is called
        await new Promise<void>((resolve) => {
          resolvers.push(resolve)
        })
        return new Response(null, { status: 200 })
      }

      if (urlStr.includes('/extract')) {
        return new Response(
          JSON.stringify({ extractionId: 'ext-123', status: 'queued' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })

    const { result } = renderHook(() => useDocumentsUploadQueue())

    const files = Array.from({ length: 5 }, (_, i) =>
      new File([`pdf-data-${i}`], `poliza_${i + 1}.pdf`, { type: 'application/pdf' }),
    )

    act(() => {
      result.current.enqueueFiles(files)
    })

    const resolveNextInFlight = async () => {
      await waitFor(() => {
        expect(resolvers.length).toBeGreaterThan(0)
      })
      act(() => {
        const resolve = resolvers.shift()
        resolve?.()
      })
    }

    // 1. Initial state: Exactly 3 files start uploading and 2 remain pending
    await waitFor(() => {
      const queue = getQueue(result)
      const uploadingCount = queue.filter((item: any) => item.status === 'uploading').length
      const pendingCount = queue.filter((item: any) => item.status === 'pending').length
      expect(uploadingCount).toBe(3)
      expect(pendingCount).toBe(2)
    })

    // 2. Resolve first upload: 1 success, 4th file starts uploading (maintains concurrency at 3), 1 remains pending
    await resolveNextInFlight()

    await waitFor(() => {
      const queue = getQueue(result)
      const successCount = queue.filter((item: any) => item.status === 'success').length
      const uploadingCount = queue.filter((item: any) => item.status === 'uploading').length
      const pendingCount = queue.filter((item: any) => item.status === 'pending').length
      expect(successCount).toBe(1)
      expect(uploadingCount).toBe(3)
      expect(pendingCount).toBe(1)
    })

    // 3. Resolve second upload: 2 success, 5th file starts uploading (3 uploading, 0 pending)
    await resolveNextInFlight()

    await waitFor(() => {
      const queue = getQueue(result)
      const successCount = queue.filter((item: any) => item.status === 'success').length
      const uploadingCount = queue.filter((item: any) => item.status === 'uploading').length
      const pendingCount = queue.filter((item: any) => item.status === 'pending').length
      expect(successCount).toBe(2)
      expect(uploadingCount).toBe(3)
      expect(pendingCount).toBe(0)
    })

    // 4. Resolve remaining 3 in-flight uploads (files 3, 4, and 5)
    await resolveNextInFlight()
    await resolveNextInFlight()
    await resolveNextInFlight()

    // 5. All 5 files must successfully transition to 'success'
    await waitFor(() => {
      const queue = getQueue(result)
      const successCount = queue.filter((item: any) => item.status === 'success').length
      const uploadingCount = queue.filter((item: any) => item.status === 'uploading').length
      const pendingCount = queue.filter((item: any) => item.status === 'pending').length
      expect(successCount).toBe(5)
      expect(uploadingCount).toBe(0)
      expect(pendingCount).toBe(0)
    })
  })

  it('should transition to "success" after uploadUrl, PUT upload, and extraction trigger', async () => {
    const { result } = renderHook(() => useDocumentsUploadQueue())

    const file = new File(['valid pdf binary'], 'poliza_valida.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.enqueueFiles([file])
    })

    await waitFor(() => {
      const queue = getQueue(result)
      expect(queue[0].status).toBe('success')
    })

    // Verify calls:
    // 1. POST /policies/upload-url
    // 2. PUT uploadUrl
    // 3. POST /policies/extract
    const calls = fetchMock.mock.calls
    const hasUploadUrlCall = calls.some(([url]: [any]) => String(url).includes('/upload-url'))
    const hasPutUploadCall = calls.some(([url, init]: [any, any]) =>
      String(url).includes('signed-put-target') || init?.method === 'PUT',
    )
    const hasExtractCall = calls.some(([url]: [any]) => String(url).includes('/extract'))

    expect(hasUploadUrlCall).toBe(true)
    expect(hasPutUploadCall).toBe(true)
    expect(hasExtractCall).toBe(true)
  })

  it('should clear completed items from the queue with clearCompleted()', async () => {
    const { result } = renderHook(() => useDocumentsUploadQueue())

    const validFile = new File(['valid'], 'valida.pdf', { type: 'application/pdf' })
    const invalidFile = new File(['invalid'], 'invalida.png', { type: 'image/png' })

    act(() => {
      result.current.enqueueFiles([validFile, invalidFile])
    })

    // Wait for the valid file to complete
    await waitFor(() => {
      const queue = getQueue(result)
      const validItem = queue.find((item: any) => item.file.name === 'valida.pdf')
      expect(validItem?.status).toBe('success')
    })

    // Clear completed
    act(() => {
      result.current.clearCompleted()
    })

    const queueAfterClear = getQueue(result)
    expect(queueAfterClear).toHaveLength(1)
    expect(queueAfterClear[0].file.name).toBe('invalida.png')
    expect(queueAfterClear[0].status).toBe('error')
  })

  it('should retry a failed item when retryItem(id) is called', async () => {
    // Fail first upload attempt, then succeed on retry
    let callCount = 0
    fetchMock.mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      if (urlStr.includes('/upload-url')) {
        callCount++
        if (callCount === 1) {
          return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 })
        }
        return new Response(
          JSON.stringify({
            uploadUrl: 'https://r2.storage.example.com/retry-put-target',
            policyAssetKey: 'org-test/retry-doc.pdf',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (urlStr.includes('retry-put-target') || (init && init.method === 'PUT')) {
        return new Response(null, { status: 200 })
      }

      if (urlStr.includes('/extract')) {
        return new Response(
          JSON.stringify({ extractionId: 'ext-retry', status: 'queued' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })

    const { result } = renderHook(() => useDocumentsUploadQueue())

    const file = new File(['data'], 'poliza_retry.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.enqueueFiles([file])
    })

    // Wait for the item to fail
    await waitFor(() => {
      const queue = getQueue(result)
      expect(queue[0].status).toBe('error')
    })

    const failedId = getQueue(result)[0].id

    // Retry item
    act(() => {
      result.current.retryItem(failedId)
    })

    // Should transition back and eventually succeed
    await waitFor(() => {
      const queue = getQueue(result)
      expect(queue[0].status).toBe('success')
    })
  })
})
