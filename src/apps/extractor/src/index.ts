import { Hono } from 'hono';
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

    const aiService = createAiService({
      aiResultQueue: env.AI_RESULT_QUEUE,
      mistralApiKey: env.MISTRAL_API_KEY,
      workersAi: env.AI,
      aiModel: env.AI_MODEL,
    });

    for (const message of batch.messages) {
      const body: any = message.body;
      const payload = body?.payload ?? body;

      if (!payload?.documentUrl) {
        // Non-actionable message - ack to avoid poison-pill retries.
        // Docs: queues/configuration/batching-retries#explicit-acknowledgement
        safeAck(message);
        continue;
      }

      try {
        await aiService.processDocument(payload);
        safeAck(message);
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        // Workers AI JSON mode impossible state -> not retryable forever, go to DLQ after max_retries
        const isJsonModeFailed = msg.includes("JSON Mode couldn't be met");
        // For transient errors (429, OCR) use exponential backoff via retry delay
        const delaySeconds = isJsonModeFailed ? 0 : calculateBackoffDelay(message.attempts);

        console.error('extractor queue failed', {
          documentUrl: payload.documentUrl,
          aiExtractionResultId: payload.aiExtractionResultId,
          attempts: message.attempts,
          isJsonModeFailed,
          error: msg,
        });

        // Explicit negative-ack: docs queues/configuration/javascript-apis#Message.retry
        if (typeof message?.retry === 'function') {
          message.retry({ delaySeconds });
        } else {
          // No per-message retry in test mock: throw to trigger batch retry semantics
          throw err;
        }
      }
    }
  },
});

export default handler satisfies ExportedHandler<CloudflareBindings>;

