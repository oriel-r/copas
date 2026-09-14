import { Hono } from 'hono';
import { validator } from 'hono/validator';
import type { AppEnv } from '../../../core/types/env';
import {
  installmentsFilterSchema,
  updateInstallmentStatusRequestSchema,
} from '@copas/contracts';
import type { PolicyInstallmentsService } from './policy-installments.service';

export function createInstallmentsRouter(
  deps?: PolicyInstallmentsService | { policyInstallmentsService: PolicyInstallmentsService }
) {
  const service = (deps as any)?.policyInstallmentsService ?? deps;

  const getService = (c: any): PolicyInstallmentsService => {
    return (
      service ??
      c.get('services')?.insurance?.policyInstallments ??
      c.get('insuranceModule')?.policyInstallmentsService
    );
  };

  const router = new Hono<AppEnv>()
    .get('/', async (c) => {
      const orgId = c.get('organizationId' as any);
      if (!orgId) return c.json({ error: 'Organization required' }, 401);

      const s = getService(c);
      const query = {
        dueDate: c.req.query('dueDate') || undefined,
        status: c.req.query('status') || undefined,
        companyId: c.req.query('companyId') || undefined,
        insuredId: c.req.query('insuredId') || undefined,
        policyId: c.req.query('policyId') || undefined,
        limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
        offset: c.req.query('offset') ? Number(c.req.query('offset')) : undefined,
      };
      
      const parsed = installmentsFilterSchema.safeParse(query);
      if (!parsed.success) {
        return c.json({ error: 'Bad Request', details: parsed.error.issues }, 400);
      }
      const result = await s.listInstallments(parsed.data);
      return c.json(result, 200);
    })
    .patch(
      '/:id',
      validator('json', (value, c) => {
        const parsed = updateInstallmentStatusRequestSchema.safeParse(value);
        if (!parsed.success) {
          return c.json({ error: 'Bad Request', details: parsed.error.issues }, 400);
        }
        return parsed.data;
      }),
      async (c) => {
        const orgId = c.get('organizationId' as any);
        if (!orgId) return c.json({ error: 'Organization required' }, 401);

        const s = getService(c);
        const id = c.req.param('id');
        const data = c.req.valid('json');
        
        try {
          const result = await s.updateStatus(id, data.status);
          if (!result) {
            return c.json({ error: 'Not Found', message: 'Installment not found' }, 404);
          }
          return c.json(result, 200);
        } catch (err: any) {
          if (err.message?.includes('not found') || err.message?.includes('Not found')) {
            return c.json({ error: 'Not Found', message: 'Installment not found' }, 404);
          }
          throw err;
        }
      }
    );

  return router;
}

export const installmentsRouter = createInstallmentsRouter();
export type InstallmentsRoutesType = typeof installmentsRouter;
