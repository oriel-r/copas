import { Hono } from 'hono';
import { ensureLogger, getLogger, withLogContext } from '@copas/logger';
import { createAiService } from './modules/ai/ai.service';

const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

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

    const aiService = createAiService({
      aiResultQueue: env.AI_RESULT_QUEUE,
      mistralApiKey: env.MISTRAL_API_KEY,
      workersAi: env.AI,
      aiModel: env.AI_MODEL,
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
            await aiService.processDocument(payload);
            const durationMs = Math.round((performance.now() - start) * 100) / 100;
            logger.info('Document extraction processed and acknowledged successfully in {durationMs}ms', {
              durationMs,
              aiExtractionResultId: payload.aiExtractionResultId,
            });
            safeAck(message);
          } catch (err: any) {
            const durationMs = Math.round((performance.now() - start) * 100) / 100;
            const msg = err?.message ?? String(err);
            // Workers AI JSON mode impossible state -> not retryable forever, go to DLQ after max_retries
            const isJsonModeFailed = msg.includes("JSON Mode couldn't be met");
            // For transient errors (429, OCR) use exponential backoff via retry delay
            const delaySeconds = isJsonModeFailed ? 0 : calculateBackoffDelay(message.attempts);

            logger.error('Document extraction queue processing failed in {durationMs}ms: {error}', {
              documentUrl: payload.documentUrl,
              aiExtractionResultId: payload.aiExtractionResultId,
              attempts: message.attempts,
              isJsonModeFailed,
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

