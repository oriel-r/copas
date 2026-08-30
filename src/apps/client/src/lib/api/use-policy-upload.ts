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
      // 1. Upload file to R2 via Hono RPC endpoint
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch(apiClient.policies.upload.$url(), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!uploadRes.ok) {
        throw new Error(`Upload failed with status ${uploadRes.status}`)
      }

      const uploadResult = (await uploadRes.json()) as { policyAssetKey: string; documentUrl: string; filename: string }

      // 2. Trigger AI extraction pipeline via Hono RPC client
      // Tenant is resolved server-side via header/session, no need to send organizationId from client
      const extractRes = await apiClient.policies.extract.$post({
        json: {
          policyAssetKey: uploadResult.policyAssetKey,
          documentUrl: uploadResult.documentUrl,
        },
      })

      if (!extractRes.ok) {
        throw new Error(`Extraction trigger failed with status ${extractRes.status}`)
      }

      const extractionResult = (await extractRes.json()) as { aiExtractionResultId: string; status: string }

      return {
        ...uploadResult,
        extraction: extractionResult,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] })
    },
  })
}

