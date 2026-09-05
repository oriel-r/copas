import { Hono } from 'hono';
import { ensureLogger, getLogger, withLogContext } from '@copas/logger';
import { createAiRouter } from './modules/ai/ai.routes.js';

export { PolicyExtractionWorkflow } from './modules/ai/workflows/policy-extraction.workflow.js';

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

app.route('/', createAiRouter());

function calculateBackoffDelay(attempts?: number): number {
  const a = typeof attempts === 'number' && attempts > 0 ? attempts : 1;
  // Exponential backoff cap 1h (3600s), base 60s: 60, 120, 240...
  return Math.min(60 * 2 ** (a - 1), 3600);
}

function safeAck(message: any): void {
  if (typeof message?.ack === 'function') message.ack();
}

function safeRetry(message: any, delaySeconds: number): void {
  if (typeof message?.retry === 'function') {
    message.retry({ delaySeconds });
  } else {
    // In tests/batch mock without retry, re-throw to surface failure (Cloudflare runtime would retry whole batch)
    throw new Error(`retry not available, delay ${delaySeconds}`);
  }
}

const handler = Object.assign(app, {
  fetch: app.fetch.bind(app),
  async queue(
    batch: MessageBatch<any>,
    env: CloudflareBindings,
    _ctx: ExecutionContext,
  ): Promise<void> {
    if (!batch?.messages?.length) return;

    ensureLogger({ appName: 'extractor', environment: (env as any)?.NODE_ENV });
    const logger = getLogger(['extractor', 'queue']);

    logger.info('Received queue batch with {messagesCount} messages', {
      messagesCount: batch.messages.length,
      queue: 'copas-ai-extraction',
    });


    for (const message of batch.messages) {
      const body: any = message.body;
      const payload = body?.payload ?? body;
      const metadata = body?.metadata;
      const organizationId = metadata?.organizationId || payload?.organizationId;
      const requestId =
        metadata?.requestId ||
        payload?.requestId ||
        (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `extract-${message.id}`);

      await withLogContext(
        {
          requestId,
          organizationId,
          aiExtractionResultId: payload?.aiExtractionResultId,
          documentUrl: payload?.documentUrl,
          attempts: message.attempts,
          queue: 'copas-ai-extraction',
        },
        async () => {
          if (!payload?.documentUrl) {
            // Non-actionable message - ack to avoid poison-pill retries.
            logger.warn('Non-actionable message without documentUrl received, acknowledging to avoid poison pill', {
              messageId: message.id,
              body,
            });
            safeAck(message);
            return;
          }

          const start = performance.now();
          logger.info('Starting document extraction processing for result {aiExtractionResultId}', {
            documentUrl: payload.documentUrl,
            aiExtractionResultId: payload.aiExtractionResultId,
            attempts: message.attempts,
          });

          try {
            await env.EXTRACTION_WORKFLOW.create({
              id: payload.aiExtractionResultId,
              params: {
                ...payload,
                organizationId,
                requestId,
              },
            });
            const durationMs = Math.round((performance.now() - start) * 100) / 100;
            logger.info('Document extraction workflow triggered successfully in {durationMs}ms', {
              durationMs,
              aiExtractionResultId: payload.aiExtractionResultId,
            });
            safeAck(message);
          } catch (err: any) {
            const durationMs = Math.round((performance.now() - start) * 100) / 100;
            const msg = err?.message ?? String(err);
            
            if (msg.includes('already exists') || err?.name === 'InstanceAlreadyExistsError') {
              logger.info('Workflow instance already exists for {aiExtractionResultId}, treating as duplicate', {
                aiExtractionResultId: payload.aiExtractionResultId,
              });
              safeAck(message);
              return;
            }

            // For other errors, retry
            const delaySeconds = calculateBackoffDelay(message.attempts);

            logger.error('Document extraction workflow creation failed in {durationMs}ms: {error}', {
              documentUrl: payload.documentUrl,
              aiExtractionResultId: payload.aiExtractionResultId,
              attempts: message.attempts,
              delaySeconds,
              durationMs,
              error: msg,
              stack: err?.stack,
            });

            // Explicit negative-ack: docs queues/configuration/javascript-apis#Message.retry
            safeRetry(message, delaySeconds);
          }
        }
      );
    }
  },
});

export default handler satisfies ExportedHandler<CloudflareBindings>;

