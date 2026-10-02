import { z } from '@copas/contracts';

export const uploadUrlRequestSchema = z.object({
  filename: z.string(),
  contentType: z.string(),
});

export type UploadUrlRequest = z.infer<typeof uploadUrlRequestSchema>;

export const uploadUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  policyAssetKey: z.string(),
});

export type UploadUrlResponse = z.infer<typeof uploadUrlResponseSchema>;

