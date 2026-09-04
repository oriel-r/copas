import type { R2Bucket } from '@cloudflare/workers-types';
import type { FilesServiceContract, FileMetadata, UploadUrlResult, StoredFile } from '@copas/contracts';

export type { FilesServiceContract, FileMetadata, UploadUrlResult, StoredFile };

export interface FilesServiceDeps {
  bucket: R2Bucket;
  organizationId?: string;
  r2AccountId?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
  r2BucketName?: string;
  backendUrl?: string;
  signingSecret?: string;
}

export type FilesService = FilesServiceContract;
