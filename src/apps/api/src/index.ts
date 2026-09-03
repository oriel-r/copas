import { Hono } from 'hono';
import type { MessageBatch, ExecutionContext } from '@cloudflare/workers-types';
import { ensureLogger, getLogger, withLogContext } from '@copas/logger';
import { applyMiddlewares } from './core/setup/app.middlewares';
import { registerRoutes } from './core/setup/app.router';
import { registerErrorHandlers } from './core/setup/app.errors';
import type { AppEnv } from './core/types/env';
import { createInsuranceModule } from './modules/insurance/insurance.module';

// 1. Create the main instance
const app = new Hono<AppEnv>();

// 2. Bootstrap in strict order
applyMiddlewares(app);
const routes = registerRoutes(app);
registerErrorHandlers(app);

function calcApiBackoff(attempts?: number): number {
  const a = typeof attempts === 'number' && attempts > 0 ? attempts : 1;
  return Math.min(30 * 2 ** (a - 1), 3600);
}

// 3. Export app with queue handler
const handler = Object.assign(app, {
  fetch: app.fetch.bind(app),
  async queue(batch: MessageBatch<any>, env: any, _ctx: ExecutionContext): Promise<void> {
    if (!batch?.messages?.length) return;

    ensureLogger({ appName: 'api', environment: env?.NODE_ENV });
    const queueLogger = getLogger(['api', 'queue']);

    queueLogger.info('Received queue batch with {messagesCount} messages', {
      messagesCount: batch.messages.length,
      queue: 'copas-ai-result',
    });

    for (const message of batch.messages) {
      const body: any = message.body;
      const isAiResult =
        body?.type === 'ai-result' ||
        body?.type === 'ai_result' ||
        !!body?.structuredPayload ||
        !!body?.payload?.structuredPayload;

      const payload = body?.payload ?? body;
      const organizationId =
        body?.metadata?.organizationId ||
        payload?.organizationId ||
        (payload as any)?.metadata?.organizationId;

      const requestId =
        body?.metadata?.requestId ||
        payload?.requestId ||
        (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `queue-${message.id}`);

      await withLogContext(
        {
          requestId,
          organizationId,
          aiExtractionResultId: payload?.aiExtractionResultId,
          attempts: (message as any).attempts,
          queue: 'copas-ai-result',
        },
        async () => {
          if (!isAiResult) {
            queueLogger.warn('Discarding non-ai-result message', { type: body?.type });
            if (typeof message.ack === 'function') message.ack();
            return;
          }

          if (!organizationId) {
            queueLogger.error('Missing organizationId in message body', { body });
            if (typeof message.ack === 'function') message.ack();
            return;
          }

          const start = performance.now();
          queueLogger.info('Processing AI result message started', {
            aiExtractionResultId: payload?.aiExtractionResultId,
            attempts: (message as any).attempts,
          });

          try {
            const insuranceModule = createInsuranceModule(
              env.DB as any,
              organizationId,
              (env as any).DOCUMENT_BUCKET,
              (env as any).AI_QUEUE
            );
            await insuranceModule.policies.processAiResult({
              ...payload,
              organizationId,
            });

            const durationMs = Math.round((performance.now() - start) * 100) / 100;
            queueLogger.info('AI result message processed successfully in {durationMs}ms', {
              durationMs,
              aiExtractionResultId: payload?.aiExtractionResultId,
            });

            if (typeof message.ack === 'function') message.ack();
          } catch (err: any) {
            const durationMs = Math.round((performance.now() - start) * 100) / 100;
            const msg = err?.message ?? String(err);
            const delaySeconds = calcApiBackoff((message as any).attempts);

            queueLogger.error('AI result message processing failed in {durationMs}ms: {error}', {
              aiExtractionResultId: payload?.aiExtractionResultId,
              organizationId,
              attempts: (message as any).attempts,
              delaySeconds,
              durationMs,
              error: msg,
              stack: err?.stack,
            });

            if (typeof (message as any).retry === 'function') {
              (message as any).retry({ delaySeconds });
            } else {
              throw err;
            }
          }
        }
      );
    }
  },
});

export type { AppType } from './core/setup/app.router';
export default handler;

