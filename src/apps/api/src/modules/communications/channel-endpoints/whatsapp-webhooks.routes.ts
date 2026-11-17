import { Hono } from 'hono'
import { whatsappChannelStatusWebhookSchema } from '@copas/contracts'
import type { AppEnv } from '../../../core/types/env'
import type { ChannelEndpointsService } from './channel-endpoints.service'
import { verifyWebhookHmacSha256 } from './channel-status-webhook.security'

export const createWhatsAppWebhooksRouter = (deps?: {
  channelEndpointsService?: ChannelEndpointsService
}) => {
  const getService = (c: any): ChannelEndpointsService => {
    return (
      deps?.channelEndpointsService ??
      c.get('services' as any)?.communications?.channelEndpoints ??
      c.get('channelEndpointsService' as any)
    )
  }

  return new Hono<AppEnv>().post('/whatsapp-channel-status', async (c) => {
    const secret = String(
      (c.env as any)?.WHATSAPP_STATUS_WEBHOOK_SECRET ??
        (c.env as any)?.META_APP_SECRET ??
        '',
    ).trim()

    const rawBody = await c.req.arrayBuffer()
    const signature = c.req.header('X-Hub-Signature-256')

    const isValid = await verifyWebhookHmacSha256(rawBody, signature, secret)
    if (!isValid) {
      return c.json({ error: 'Invalid signature' }, 401)
    }

    let rawJson: unknown
    try {
      rawJson = JSON.parse(new TextDecoder().decode(rawBody))
    } catch {
      return c.json({ error: 'Bad Request', message: 'Invalid JSON payload' }, 400)
    }

    const parsed = whatsappChannelStatusWebhookSchema.safeParse(rawJson)
    if (!parsed.success) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Invalid channel status payload',
          details: parsed.error.issues,
        },
        400,
      )
    }

    const service = getService(c)
    const endpoint = await service.syncWhatsAppConnectionStatus(parsed.data)
    if (!endpoint) {
      return c.json({ error: 'Not Found', message: 'No matching WhatsApp endpoint' }, 404)
    }

    return c.json({ ok: true, endpoint }, 200)
  })
}

export const whatsappWebhooksRouter = createWhatsAppWebhooksRouter()
