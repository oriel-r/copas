import { Hono } from 'hono';
import { applyMiddlewares } from './core/setup/app.middlewares';
import { registerRoutes } from './core/setup/app.router';
import { registerErrorHandlers } from './core/setup/app.errors';
import type { AppEnv } from './core/types/env';

// 1. Create the main instance
const app = new Hono<AppEnv>();

// 2. Bootstrap in strict order
applyMiddlewares(app);
registerRoutes(app);
registerErrorHandlers(app);

import { createInsuranceModule } from './modules/insurance/insurance.module';

// 3. Export app with queue handler
const handler = Object.assign(app, {
  fetch: app.fetch.bind(app),
  async queue(batch: MessageBatch<any>, env: any, ctx: ExecutionContext) {
    if (batch?.messages) {
      for (const message of batch.messages) {
        const body = message.body;
        if (body?.type === 'ai-result' || body?.structuredPayload) {
          const payload = body.payload ?? body;
          const tenantId = body.metadata?.organizationId || payload.tenantId || 'default';
          const insuranceModule = createInsuranceModule(
            env.DB,
            tenantId,
            env.DOCUMENT_BUCKET,
            env.AI_QUEUE
          );
          await insuranceModule.policies.processAiResult(payload);
        }
      }
    }
  }
});

export default handler;

