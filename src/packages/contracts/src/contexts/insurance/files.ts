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

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const ALLOWED_FILE_EXTENSIONS = ['pdf'] as const;
export const ALLOWED_MIME_TYPES = ['application/pdf'] as const;
export const PDF_MAGIC_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]); // %PDF-

export const pdfValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
});

export type PdfValidationResult = z.infer<typeof pdfValidationResultSchema>;

export function validatePdfMetadata(
  filename: string,
  size: number,
  contentType?: string
): PdfValidationResult {
  if (size <= 0 || size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'El archivo excede el tamaño máximo permitido de 15MB o es inválido' };
  }
  if (!filename.toLowerCase().endsWith('.pdf') || filename.length <= 4) {
    return { valid: false, error: 'Solo se permiten archivos de tipo PDF' };
  }
  if (contentType && contentType !== 'application/pdf') {
    return { valid: false, error: 'El tipo MIME debe ser application/pdf' };
  }
  return { valid: true };
}

export function validatePdfMagicBytes(
  buffer: ArrayBuffer | Uint8Array
): PdfValidationResult {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  
  if (bytes.byteLength < 5) {
    return { valid: false, error: 'Buffer de archivo incompleto o vacío' };
  }

  for (let i = 0; i < PDF_MAGIC_BYTES.length; i++) {
    if (bytes[i] !== PDF_MAGIC_BYTES[i]) {
      return { valid: false, error: 'Firma binaria de archivo no válida: no es un documento PDF legítimo' };
    }
  }

  return { valid: true };
}
