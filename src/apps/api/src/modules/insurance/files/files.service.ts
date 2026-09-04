import { AwsClient } from 'aws4fetch';
import type { FilesServiceDeps, FilesService, UploadUrlResult, StoredFile } from './files.types';

export function createFilesService(deps: FilesServiceDeps): FilesService {
  const getCredentials = () => {
    const accessKeyId = deps.r2AccessKeyId ?? (deps as any).accessKeyId;
    const secretAccessKey = deps.r2SecretAccessKey ?? (deps as any).secretAccessKey;
    const accountId = deps.r2AccountId ?? (deps as any).accountId ?? 'account';
    const bucketName =
      deps.r2BucketName ??
      (deps as any).bucketName ??
      ((deps.bucket as any)?.name ? (deps.bucket as any).name : 'copas-documents');

    return { accessKeyId, secretAccessKey, accountId, bucketName };
  };

  return {
    upload: async (
      key: string,
      data: ArrayBuffer | ArrayBufferLike | ReadableStream,
      options?: { contentType?: string }
    ): Promise<void> => {
      if (!key || !key.trim()) {
        throw new Error('Key is required');
      }
      await deps.bucket.put(key, data as any, {
        httpMetadata: { contentType: options?.contentType },
      });
    },

    get: async (key: string): Promise<StoredFile | null> => {
      if (!key || !key.trim()) {
        throw new Error('Key is required');
      }
      const object = await deps.bucket.get(key);
      if (!object) {
        return null;
      }
      return {
        body: object.body as unknown as ReadableStream<any>,
        contentType: object.httpMetadata?.contentType,
        httpEtag: object.httpEtag,
      };
    },

    generateTemporaryPublicUrl: async (key: string, expiresInSeconds: number = 300): Promise<string> => {
      if (!key || !key.trim()) {
        throw new Error('Key is required');
      }
      if (typeof expiresInSeconds !== 'number' || expiresInSeconds <= 0) {
        throw new Error('Invalid expiration time');
      }

      const { accessKeyId, secretAccessKey, accountId, bucketName } = getCredentials();

      if (accessKeyId && secretAccessKey) {
        const aws = new AwsClient({
          accessKeyId,
          secretAccessKey,
        });
        const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`);
        url.searchParams.set('X-Amz-Expires', String(expiresInSeconds));
        const signed = await aws.sign(new Request(url, { method: 'GET' }), {
          aws: { signQuery: true },
        });
        return signed.url;
      }

      // Local fallback
      const baseUrl = deps.backendUrl || 'http://localhost:8788';
      const expires = Date.now() + expiresInSeconds * 1000;
      return `${baseUrl}/policies/documents/${key}?token=local-dev-token&expires=${expires}`;
    },

    generateUploadUrl: async (
      filename: string,
      organizationId: string,
      expiresInSeconds: number = 300
    ): Promise<UploadUrlResult> => {
      if (!filename?.trim()) throw new Error('Filename is required');
      if (!organizationId?.trim()) throw new Error('Organization ID is required');
      if (typeof expiresInSeconds !== 'number' || expiresInSeconds <= 0) throw new Error('Invalid expiration time');

      const id = crypto.randomUUID();
      const key = `${organizationId}/${id}-${filename}`;

      const { accessKeyId, secretAccessKey, accountId, bucketName } = getCredentials();

      if (accessKeyId && secretAccessKey) {
        const aws = new AwsClient({
          accessKeyId,
          secretAccessKey,
        });
        const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`);
        url.searchParams.set('X-Amz-Expires', String(expiresInSeconds));
        const signed = await aws.sign(new Request(url, { method: 'PUT' }), {
          aws: { signQuery: true },
        });
        return { uploadUrl: signed.url, policyAssetKey: key };
      }

      // Local fallback
      const baseUrl = deps.backendUrl || 'http://localhost:8788';
      const expires = Date.now() + expiresInSeconds * 1000;
      const uploadUrl = `${baseUrl}/policies/documents/upload?key=${encodeURIComponent(key)}&token=local-dev-token&expires=${expires}`;

      return { uploadUrl, policyAssetKey: key };
    },

    delete: async (key: string): Promise<void> => {
      if (!key || !key.trim()) {
        throw new Error('Key is required');
      }
      await deps.bucket.delete(key);
    },
  };
}
