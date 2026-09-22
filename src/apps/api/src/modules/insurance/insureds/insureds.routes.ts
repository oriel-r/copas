import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { AppEnv } from '../../../core/types/env'

import {
  insuredsFilterSchema,
  updateInsuredRequestSchema,
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
    .get('/:id', async (c) => {
      const orgId = c.get('organizationId' as any)
      if (!orgId) {
        return c.json({ error: 'Organization required' }, 401)
      }
      
      const service = getService(c)
      const id = c.req.param('id')
      const result = await service.getDetailById(id)
      if (!result) {
        return c.json({ error: 'Insured not found' }, 404)
      }
      return c.json(result, 200)
    })
    .patch(
      '/:id',
      zValidator('json', updateInsuredRequestSchema, (result, c) => {
        if (!result.success) {
          return c.json({ error: 'Bad Request', message: 'Datos de asegurado inválidos', details: result.error.issues }, 400)
        }
      }),
      async (c) => {
        const orgId = c.get('organizationId' as any)
        if (!orgId) {
          return c.json({ error: 'Organization required' }, 401)
        }
        
        const service = getService(c)
        const id = c.req.param('id')
        const body = c.req.valid('json')
        try {
          const result = await service.updateProfile(id, body)
          if (!result) {
            return c.json({ error: 'Insured not found' }, 404)
          }
          return c.json(result, 200)
        } catch (err: any) {
          if (err.message === 'CUIT already registered' || err.code === 'CONFLICT' || err.status === 409) {
            return c.json({ error: 'Conflict', message: 'CUIT already registered' }, 409)
          }
          if (err.message === 'Insured not found' || err.status === 404) {
            return c.json({ error: 'Insured not found' }, 404)
          }
          throw err
        }
      }
    )

  return router
}

export const insuredsRouter = createInsuredsRouter()
export type InsuredsRouterType = typeof insuredsRouter
