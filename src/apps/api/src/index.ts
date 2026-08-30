import { Hono } from 'hono';
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
  async queue(batch: MessageBatch<any>, env: CloudflareBindings, _ctx: ExecutionContext): Promise<void> {
    if (!batch?.messages?.length) return;
    for (const message of batch.messages) {
      const body: any = message.body;
      const isAiResult = body?.type === 'ai-result' || body?.type === 'ai_result' || !!body?.structuredPayload || !!body?.payload?.structuredPayload;
      if (!isAiResult) {
        if (typeof message.ack === 'function') message.ack();
        continue;
      }
      const payload = body.payload ?? body;
      const organizationId = body.metadata?.organizationId || payload.organizationId || (payload as any).metadata?.organizationId;
      if (!organizationId) {
        console.error('[api queue] missing organizationId', { body });
        if (typeof message.ack === 'function') message.ack();
        continue;
      }
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
        if (typeof message.ack === 'function') message.ack();
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        console.error('[api queue] processAiResult failed', {
          aiExtractionResultId: payload?.aiExtractionResultId,
          organizationId,
          attempts: (message as any).attempts,
          error: msg,
        });
        if (typeof (message as any).retry === 'function') {
          (message as any).retry({ delaySeconds: calcApiBackoff((message as any).attempts) });
        } else {
          throw err;
        }
      }
    }
  }
});

export type AppType = typeof routes;
export default handler;

