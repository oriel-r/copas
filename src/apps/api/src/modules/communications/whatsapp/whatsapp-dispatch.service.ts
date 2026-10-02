import type { Queue } from '@cloudflare/workers-types'
import type {
  WhatsAppOutboundQueueMessage,
  WhatsAppTemplateComponent,
} from '@copas/contracts'
import type { ResolvedChannelEndpoint } from '../channel-endpoints/channel-endpoints.repository'

export function createWhatsAppDispatchService(whatsappQueueOrDeps?: Queue<WhatsAppOutboundQueueMessage> | any) {
  const whatsappQueue =
    whatsappQueueOrDeps?.whatsappQueue ??
    whatsappQueueOrDeps?.queue ??
    whatsappQueueOrDeps

  return {
    enqueueTemplateReminder: async (params: {
      organizationId: string
      messageId: string
      conversationId: string
      endpoint?: ResolvedChannelEndpoint
      organizationChannelEndpointId?: string
      phoneNumberId?: string
      credentials?: {
        accessToken: string
        wabaId?: string
      }
      to: string
      templateName: string
      languageCode?: string
      components: WhatsAppTemplateComponent[]
      idempotencyKey?: string
    }): Promise<void> => {
      if (!whatsappQueue) throw new Error('WhatsApp queue is not configured')

      const organizationChannelEndpointId =
        params.organizationChannelEndpointId ??
        params.endpoint?.endpointId ??
        (params.endpoint as any)?.id ??
        (params as any).endpointId

      const phoneNumberId =
        params.phoneNumberId ??
        params.endpoint?.phoneNumberId ??
        (params.endpoint as any)?.credentials?.phoneNumberId

      const credentials =
        params.credentials ??
        params.endpoint?.credentials ??
        { accessToken: '' }

      const idempotencyKey = params.idempotencyKey || `${params.organizationId}:${params.messageId}`

      const payload: WhatsAppOutboundQueueMessage = {
        type: 'whatsapp-outbound',
        payload: {
          messageId: params.messageId,
          conversationId: params.conversationId,
          organizationId: params.organizationId,
          organizationChannelEndpointId: organizationChannelEndpointId || '',
          phoneNumberId: phoneNumberId || '',
          to: params.to,
          mode: 'template',
          template: {
            name: params.templateName,
            language: {
              code: params.languageCode || 'es_AR',
            },
            components: params.components,
          },
          credentials: {
            accessToken: credentials.accessToken,
            wabaId: credentials.wabaId,
          },
        },
        metadata: {
          organizationId: params.organizationId,
          idempotencyKey,
        },
      }

      await whatsappQueue.send(payload)
    },
  }
}

export type WhatsAppDispatchService = ReturnType<typeof createWhatsAppDispatchService>
