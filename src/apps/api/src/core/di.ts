import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from './types/env';
import { createInsuranceModule } from '../modules/insurance/insurance.module';

export const injectAppServices = createMiddleware<AppEnv>(async (c, next) => {
  const organizationId = c.get('organizationId' as any) as string | null;
  const userId = c.get('userId' as any) as string | null;

  // Prod strict: every /policies/* requires organization context except document download
  const isDocDownload = c.req.path.startsWith('/policies/documents/');
  const needsOrg = c.req.path.startsWith('/policies') && !isDocDownload;
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
        (c.env as any).AI_QUEUE,
        {
          r2AccountId: (c.env as any)?.R2_ACCOUNT_ID,
          r2AccessKeyId: (c.env as any)?.R2_ACCESS_KEY_ID,
          r2SecretAccessKey: (c.env as any)?.R2_SECRET_ACCESS_KEY,
          r2BucketName: (c.env as any)?.R2_BUCKET_NAME,
          backendUrl: (c.env as any)?.BACKEND_URL,
          signingSecret: (c.env as any)?.BETTER_AUTH_SECRET,
        }
      );
    }
  };

  c.set('services', services);
  
  await next();
});
