import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { upsertOrganizationWhatsAppEndpointRequestSchema } from '@copas/contracts'
import type { AppEnv } from '../../../core/types/env'
import type { ChannelEndpointsService } from './channel-endpoints.service'

export const createChannelEndpointsRouter = (deps?: {
  channelEndpointsService?: ChannelEndpointsService
}) => {
  const getService = (c: any): ChannelEndpointsService => {
    return (
      deps?.channelEndpointsService ??
      c.get('services' as any)?.communications?.channelEndpoints ??
      c.get('channelEndpointsService' as any)
    )
  }

  return new Hono<AppEnv>()
    .get('/whatsapp', async (c) => {
      const orgId = c.get('organizationId' as any) as string | null
      if (!orgId) {
        return c.json({ error: 'Organization required' }, 401)
      }

      const service = getService(c)
      const endpoint = await service.getOrganizationWhatsAppEndpoint(orgId)
      return c.json({ endpoint }, 200)
    })
    .put(
      '/whatsapp',
      zValidator('json', upsertOrganizationWhatsAppEndpointRequestSchema, (result, c) => {
        if (!result.success) {
          return c.json(
            {
              error: 'Bad Request',
              message: 'Número de teléfono inválido',
              details: result.error.issues,
            },
            400,
          )
        }
      }),
      async (c) => {
        const orgId = c.get('organizationId' as any) as string | null
        if (!orgId) {
          return c.json({ error: 'Organization required' }, 401)
        }

        const service = getService(c)
        const body = c.req.valid('json')
        const endpoint = await service.upsertOrganizationWhatsAppEndpoint(body.number, orgId)
        return c.json({ endpoint }, 200)
      },
    )
}

export const channelEndpointsRouter = createChannelEndpointsRouter()
export type ChannelEndpointsRouterType = typeof channelEndpointsRouter
