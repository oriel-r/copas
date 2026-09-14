import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { AppEnv } from '../../../core/types/env'

import {
  insuredsFilterSchema
} from '@copas/contracts'
import type { InsuredsService } from './insureds.service'

export const createInsuredsRouter = (deps?: { insuredsService?: InsuredsService }) => {

  const getService = (c: any): InsuredsService => {
    return (
      deps?.insuredsService ??
      c.get('services' as any)?.insurance?.insureds ??
      c.get('insuranceModule' as any)?.insuredsService ??
      c.get('insuredsService' as any)
    );
  };

  const router = new Hono<AppEnv>()
    .get('/', zValidator('query', insuredsFilterSchema), async (c) => {
      const orgId = c.get('organizationId' as any)
      if (!orgId) {
        return c.json({ error: 'Organization required' }, 401)
      }
      
      const service = getService(c)
      const filters = c.req.valid('query')
      
      // We can fallback to other methods just in case
      const listMethod = service.listDetailed || (service as any).listInsuredsDetailed || (service as any).listWithDetails || (service as any).list
      const response = await listMethod.call(service, filters)
      return c.json(response, 200)
    })
    .get('/filter-options', async (c) => {
      const orgId = c.get('organizationId' as any)
      if (!orgId) {
        return c.json({ error: 'Organization required' }, 401)
      }
      
      const service = getService(c)
      const response = await service.getFilterOptions()
      
      return c.json(response, 200)
    })

  return router
}

export const insuredsRouter = createInsuredsRouter()
export type InsuredsRouterType = typeof insuredsRouter
