import { getLogger } from '@copas/logger';

export const createMistralOcrClient = (deps: { mistralApiKey: string }) => {
  const logger = getLogger(['extractor', 'ocr']);

  return {
    process: async (documentUrl: string): Promise<string> => {
      if (!deps.mistralApiKey) {
        throw new Error('Missing mistralApiKey');
      }

      logger.info('Calling Mistral OCR for document: {documentUrl}', { documentUrl });
      const start = performance.now();

      let res: Response;
      try {
        res = await fetch('https://api.mistral.ai/v1/ocr', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${deps.mistralApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'mistral-ocr-latest',
            document: { type: 'document_url', document_url: documentUrl },
          }),
        });
      } catch (networkErr: any) {
        const durationMs = Math.round((performance.now() - start) * 100) / 100;
        logger.error('Mistral OCR network fetch failed after {durationMs}ms: {error}', {
          documentUrl,
          durationMs,
          error: networkErr?.message ?? String(networkErr),
        });
        throw networkErr;
      }

      if (!res.ok) {
        const durationMs = Math.round((performance.now() - start) * 100) / 100;
        const errText = await res.text().catch(() => res.statusText);
        logger.error('Mistral OCR failed after {durationMs}ms: {status} {statusText} - {error}', {
          documentUrl,
          durationMs,
          status: res.status,
          statusText: res.statusText,
          error: errText,
        });
        throw new Error(`Mistral OCR failed: ${res.status} ${res.statusText} - ${errText}`);
      }

      const data: any = await res.json();
      const durationMs = Math.round((performance.now() - start) * 100) / 100;

      if (Array.isArray(data?.pages)) {
        const markdown = data.pages.map((p: any) => p.markdown).join('\n\n');
        logger.info('Mistral OCR completed successfully in {durationMs}ms', {
          documentUrl,
          durationMs,
          pagesCount: data.pages.length,
          textLength: markdown.length,
        });
        return markdown;
      }

      // Justified fallback: Mistral OCR may return top-level markdown/text in non-paged responses or mocks
      if (typeof data?.markdown === 'string' && data.markdown.trim()) {
        logger.info('Mistral OCR returned raw markdown in {durationMs}ms', {
          documentUrl,
          durationMs,
          textLength: data.markdown.length,
        });
        return data.markdown;
      }

      if (typeof data?.text === 'string' && data.text.trim()) {
        logger.info('Mistral OCR returned raw text in {durationMs}ms', {
          documentUrl,
          durationMs,
          textLength: data.text.length,
        });
        return data.text;
      }

      logger.error('Unexpected Mistral OCR response structure after {durationMs}ms', {
        documentUrl,
        durationMs,
        data,
      });
      throw new Error('Unexpected Mistral OCR response: missing pages array and markdown/text');
    },
  };
};

export type MistralOcrClient = ReturnType<typeof createMistralOcrClient>;
