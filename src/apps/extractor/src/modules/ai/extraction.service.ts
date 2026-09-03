import { getLogger } from '@copas/logger';
import { createMistralOcrClient } from './ocr/mistral-ocr.client.js';
import { createStructuredOutputService } from './llm/structured-output.service.js';
import type { AiQueuePayload } from '@copas/contracts';
import type { MistralOcrClient } from './ocr/mistral-ocr.client.js';
import type { StructuredOutputService } from './llm/structured-output.service.js';

export const createExtractionService = (deps: {
  ocrClient?: MistralOcrClient;
  llmClient?: { generateStructured: (p: any) => Promise<any> };
  aiResultQueue?: any;
  mistralApiKey?: string;
  workersAi?: any;
  aiModel?: string;
} = {}) => {
  const logger = getLogger(['extractor', 'service']);
  const aiModel = deps.aiModel ?? '@cf/google/gemma-4-26b-a4b-it';

  const ocr: MistralOcrClient | { process: (url: string) => Promise<string> } =
    deps.ocrClient ??
    (deps.mistralApiKey
      ? createMistralOcrClient({ mistralApiKey: deps.mistralApiKey })
      : {
          process: async () => {
            throw new Error('Missing mistralApiKey and no ocrClient injected');
          },
        });

  const llm: StructuredOutputService = createStructuredOutputService({
    workersAi: deps.workersAi,
    aiModel,
    llmClient: deps.llmClient,
  });

  const service = {
    extractMarkdown: async (documentUrl: string): Promise<string> => {
      const res = await (ocr as any).process(documentUrl);
      // Justified: injected ocrClient in tests returns string | {markdown} | {text}
      return typeof res === 'string' ? res : (res?.markdown ?? res?.text ?? '');
    },

    normalizeToSchema: async (markdownText: string) => llm.normalizeToSchema(markdownText),

    extractPolicy: async (documentUrl: string) => {
      const markdown = await service.extractMarkdown(documentUrl);
      return service.normalizeToSchema(markdown);
    },

    processDocument: async (payload: AiQueuePayload) => {
      logger.info('Processing document pipeline started for {aiExtractionResultId}', {
        aiExtractionResultId: payload.aiExtractionResultId,
        documentUrl: payload.documentUrl,
      });

      const extracted = await service.extractPolicy(payload.documentUrl);

      if (deps.aiResultQueue && typeof deps.aiResultQueue.send === 'function') {
        const requestId = (payload as any).requestId || (payload as any).metadata?.requestId;
        await deps.aiResultQueue.send({
          type: 'ai-result',
          payload: {
            aiExtractionResultId: payload.aiExtractionResultId,
            structuredPayload: extracted,
          },
          metadata: {
            organizationId: (payload as any).organizationId,
            idempotencyKey: payload.aiExtractionResultId,
            requestId,
          },
        });

        logger.info('Dispatched ai-result payload to queue for {aiExtractionResultId}', {
          aiExtractionResultId: payload.aiExtractionResultId,
          requestId,
        });
      }

      return extracted;
    },
  };

  return service;
};

export type ExtractionService = ReturnType<typeof createExtractionService>;

export const createDataProcessingService = createExtractionService;
export type DataProcessingService = ReturnType<typeof createDataProcessingService>;
