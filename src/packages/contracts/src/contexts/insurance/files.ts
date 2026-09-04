import { z } from 'zod';

export const fileMetadataSchema = z.object({
  contentType: z.string().optional(),
  size: z.number().optional(),
  etag: z.string().optional(),
});

export type FileMetadata = z.infer<typeof fileMetadataSchema>;

export const uploadUrlResultSchema = z.object({
  uploadUrl: z.string(),
  policyAssetKey: z.string(),
});

export type UploadUrlResult = z.infer<typeof uploadUrlResultSchema>;

export interface StoredFile {
  body: ReadableStream | ArrayBuffer;
  contentType?: string;
  httpEtag?: string;
}

export interface FilesServiceContract {
  upload(key: string, data: ArrayBuffer | ArrayBufferLike | ReadableStream, options?: { contentType?: string }): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  generateTemporaryPublicUrl(key: string, expiresInSeconds?: number): Promise<string>;
  generateUploadUrl(filename: string, organizationId: string, expiresInSeconds?: number): Promise<UploadUrlResult>;
  delete(key: string): Promise<void>;
}
