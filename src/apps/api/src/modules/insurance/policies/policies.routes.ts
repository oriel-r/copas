import { Hono } from 'hono';
import { uploadUrlRequestSchema } from './policies.schema';
import { createPolicyRequestSchema } from '@copas/contracts';
import type { PoliciesService } from './policies.service';
import type { AppEnv } from '../../../core/types/env';

export function createPoliciesRouter(deps?: PoliciesService | { policiesService: PoliciesService }) {
  const router = new Hono<AppEnv>();
  const service = (deps as any)?.policiesService ?? deps;

  router.get('/', async (c) => {
    const s = service ?? (c.get('insuranceModule' as any)?.policiesService || c.get('policiesService' as any));
    const result = await s.list();
    return c.json(result, 200);
  });

  router.get('/:id', async (c) => {
    const s = service ?? (c.get('insuranceModule' as any)?.policiesService || c.get('policiesService' as any));
    const id = c.req.param('id');
    const result = await s.getById(id);
    if (!result) {
      return c.json({ error: 'Policy not found' }, 404);
    }
    return c.json(result, 200);
  });

  router.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = createPolicyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error }, 400);
    }
    const s = service ?? (c.get('insuranceModule' as any)?.policiesService || c.get('policiesService' as any));
    const created = await s.create(parsed.data);
    return c.json(created, 201);
  });

  router.post('/upload-url', async (c) => {
    const body = await c.req.json();
    const parsed = uploadUrlRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error }, 400);
    }
    const s = service ?? (c.get('insuranceModule' as any)?.policiesService || c.get('policiesService' as any));
    const tenantId = (c.get('tenantId' as any) || c.get('organizationId' as any) || 'default') as string;
    const result = await s.generateUploadUrl(parsed.data, tenantId);
    return c.json(result, 200);
  });

  router.post('/process-ai-result', async (c) => {
    const body = await c.req.json();
    const s = service ?? (c.get('insuranceModule' as any)?.policiesService || c.get('policiesService' as any));
    await s.processAiResult(body);
    return c.json({ success: true }, 200);
  });

  return router;
}

const app = createPoliciesRouter();

export type PoliciesRoutesType = typeof app;
export { app as policiesRouter };


