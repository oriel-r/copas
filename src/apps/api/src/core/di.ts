import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from './types/env';
import { createInsuranceModule } from '../modules/insurance/insurance.module';

export const injectAppServices = createMiddleware<AppEnv>(async (c, next) => {
  const organizationId = c.get('organizationId' as any) as string | null;
  const userId = c.get('userId' as any) as string | null;

  // Prod strict: every /policies/* requires organization context
  const needsOrg = c.req.path.startsWith('/policies');
  if (needsOrg && !organizationId) {
    throw new HTTPException(401, { message: 'organization required - set active organization' });
  }

  const effectiveOrganizationId = organizationId as string;
  const effectiveUserId = userId ?? 'usr-anonymous';

  const services = {
    get insurance() {
      return createInsuranceModule(
        c.env.DB,
        effectiveOrganizationId,
        (c.env as any).DOCUMENT_BUCKET,
        (c.env as any).AI_QUEUE
      );
    }
  };

  c.set('services', services);
  
  await next();
});
