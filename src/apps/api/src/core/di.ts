import { createMiddleware } from 'hono/factory';
import type { AppEnv } from './types/env';
import { createInsuranceModule } from '../modules/insurance/insurance.module';

export const injectAppServices = createMiddleware<AppEnv>(async (c, next) => {
  // In a real app, this comes from the authenticated session
  const tenantId = 'TODO_TENANT_ID'; 

  const services = {
    get insurance() {
      return createInsuranceModule(
        c.env.DB,
        tenantId,
        (c.env as any).DOCUMENT_BUCKET, // Assuming bucket binding
        (c.env as any).AI_QUEUE
      );
    }
  };

  c.set('services', services);
  
  await next();
});
