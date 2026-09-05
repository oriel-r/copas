import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workflows';
import { createMistralOcrClient, type MistralOcrClient } from '../ocr/mistral-ocr.client.js';
import { createStructuredOutputService, type StructuredOutputService } from '../llm/structured-output.service.js';
import type { ExtractedPolicy } from '@copas/contracts';

export interface PolicyExtractionWorkflowParams {
  documentUrl: string;
  aiExtractionResultId: string;
  organizationId?: string;
  requestId?: string;
}

export class PolicyExtractionWorkflow extends WorkflowEntrypoint<CloudflareBindings, PolicyExtractionWorkflowParams> {
  constructor(
    ctx: ExecutionContext,
    env: CloudflareBindings,
    private deps?: {
      ocrClient?: MistralOcrClient | { process: (url: string) => Promise<string> };
      structuringService?: StructuredOutputService;
    }
  ) {
    super(ctx, env);
  }

  async run(event: WorkflowEvent<PolicyExtractionWorkflowParams>, step: WorkflowStep) {
    const { documentUrl, aiExtractionResultId, organizationId, requestId } = event.payload;

    const ocrClient =
      this.deps?.ocrClient ??
      createMistralOcrClient({ mistralApiKey: this.env.MISTRAL_API_KEY });

    const structuringService =
      this.deps?.structuringService ??
      createStructuredOutputService({
        workersAi: this.env.AI,
        aiModel: this.env.AI_MODEL ?? '@cf/google/gemma-4-26b-a4b-it',
      });

    // Step a: mistral-ocr
    const markdownText = await step.do(
      'mistral-ocr',
      { retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' }, timeout: '5 minutes' },
      async () => {
        const res = await (ocrClient as any).process(documentUrl);
        return typeof res === 'string' ? res : (res?.markdown ?? res?.text ?? '');
      }
    );

    // Step b: workers-ai-structuring
    const structuredPayload = await step.do(
      'workers-ai-structuring',
      { retries: { limit: 3, delay: '5 seconds', backoff: 'linear' }, timeout: '2 minutes' },
      async () => {
        return structuringService.normalizeToSchema(markdownText);
      }
    );

    // Step c: dispatch-ai-result
    await step.do(
      'dispatch-ai-result',
      { retries: { limit: 3, delay: '5 seconds', backoff: 'constant' }, timeout: '30 seconds' },
      async () => {
        if (this.env.AI_RESULT_QUEUE && typeof this.env.AI_RESULT_QUEUE.send === 'function') {
          await this.env.AI_RESULT_QUEUE.send({
            type: 'ai-result',
            payload: {
              aiExtractionResultId,
              structuredPayload,
            },
            metadata: {
              organizationId,
              idempotencyKey: aiExtractionResultId,
              requestId: requestId || aiExtractionResultId,
            },
          });
        }
      }
    );

    return { success: true, aiExtractionResultId, result: structuredPayload as ExtractedPolicy };
  }
}
