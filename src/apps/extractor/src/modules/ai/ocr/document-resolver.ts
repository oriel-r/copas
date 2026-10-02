import { getLogger } from '@copas/logger';
import { isPublicWebUrl } from '../utils/network.js';
import { toDataUri } from '../utils/binary.js';

export interface ResolvedDocument {
  documentUrl: string;
  isInline: boolean;
  byteLength?: number;
}

export interface DocumentResolver {
  resolve(documentUrl: string): Promise<ResolvedDocument>;
}

export const createDocumentResolver = (deps: { fetchFn?: typeof fetch } = {}): DocumentResolver => {
  const logger = getLogger(['extractor', 'ocr', 'resolver']);
  const fetchFn = deps.fetchFn ?? fetch;

  return {
    resolve: async (documentUrl: string): Promise<ResolvedDocument> => {
      // 1. Data URI: already self-contained inline document
      if (documentUrl.startsWith('data:')) {
        return { documentUrl, isInline: true };
      }

      // 2. Public Internet URL: external OCR service can fetch directly
      if (isPublicWebUrl(documentUrl)) {
        return { documentUrl, isInline: false };
      }

      // 3. Local/Private URL: fetch within local network and convert to Data URI
      logger.info('Resolving local/private document URL: {documentUrl}', { documentUrl });
      const res = await fetchFn(documentUrl);
      if (!res.ok) {
        throw new Error(
          `Failed to fetch local document for OCR from ${documentUrl}: ${res.status} ${res.statusText}`,
        );
      }

      const contentType = res.headers.get('content-type') || 'application/pdf';
      const arrayBuffer = await res.arrayBuffer();
      const dataUri = toDataUri(arrayBuffer, contentType);

      logger.info('Converted local document to Data URI ({bytes} bytes)', {
        documentUrl,
        bytes: arrayBuffer.byteLength,
      });

      return {
        documentUrl: dataUri,
        isInline: true,
        byteLength: arrayBuffer.byteLength,
      };
    },
  };
};

export const defaultDocumentResolver = createDocumentResolver();
export const resolveDocumentForOcr = (documentUrl: string, fetchFn?: typeof fetch) =>
  (fetchFn ? createDocumentResolver({ fetchFn }) : defaultDocumentResolver).resolve(documentUrl);
