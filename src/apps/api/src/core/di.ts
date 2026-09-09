import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from './types/env';
import { createInsuranceModule } from '../modules/insurance/insurance.module';
import { createCommunicationsModule } from '../modules/communications/communications.module';
import { createRemindersModule } from '../modules/reminders/reminders.module';

export const injectAppServices = createMiddleware<AppEnv>(async (c, next) => {
  const organizationId = c.get('organizationId' as any) as string | null;
  const userId = c.get('userId' as any) as string | null;

  // Prod strict: every /policies/*, /reminder-rules/* and /reminders/* requires organization context except document download
  const isDocDownload = c.req.path.startsWith('/policies/documents/');
  const needsOrg =
    (c.req.path.startsWith('/policies') && !isDocDownload) ||
    c.req.path.startsWith('/reminder-rules') ||
    c.req.path.startsWith('/reminders');
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
    },
    get communications() {
      return createCommunicationsModule(
        c.env.DB,
        effectiveOrganizationId,
        (c.env as any).WHATSAPP_QUEUE,
        {
          platformWhatsAppAccessToken: (c.env as any)?.WHATSAPP_ACCESS_TOKEN,
          platformWhatsAppPhoneNumberId: (c.env as any)?.WHATSAPP_PHONE_NUMBER_ID,
          platformWhatsAppWabaId: (c.env as any)?.WHATSAPP_WABA_ID,
        }
      );
    },
    get reminders() {
      return createRemindersModule(
        c.env.DB,
        effectiveOrganizationId,
        services.insurance,
        services.communications
      );
    }
  };

  c.set('services', services);
  
  await next();
});

