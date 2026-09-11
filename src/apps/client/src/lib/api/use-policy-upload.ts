import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export type UploadPolicyResponse = {
  policyAssetKey: string
  documentUrl: string
  filename: string
  extraction?: {
    aiExtractionResultId: string
    status: string
  }
}

export function usePolicyUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File): Promise<UploadPolicyResponse> => {
      // 1. Request signed upload URL
      const urlRes = await apiClient.policies['upload-url'].$post({
        json: {
          filename: file.name,
          contentType: 'application/pdf',
        },
      })

      if (!urlRes.ok) {
        throw new Error(`Failed to get upload URL: ${urlRes.status}`)
      }

      const { uploadUrl, policyAssetKey } = await urlRes.json()

      // 2. Direct PUT to storage via signed URL
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'application/pdf',
        },
      })

      if (!uploadRes.ok) {
        throw new Error(`Upload failed with status ${uploadRes.status}`)
      }

      // 3. Trigger AI extraction pipeline via Hono RPC client
      const extractRes = await apiClient.policies.extract.$post({
        json: {
          policyAssetKey,
          documentUrl: policyAssetKey,
        },
      })

      if (!extractRes.ok) {
        throw new Error(`Extraction trigger failed with status ${extractRes.status}`)
      }

      const extractionResult = (await extractRes.json()) as { aiExtractionResultId: string; status: string }

      return {
        policyAssetKey,
        documentUrl: policyAssetKey,
        filename: file.name,
        extraction: extractionResult,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] })
    },
  })
}

