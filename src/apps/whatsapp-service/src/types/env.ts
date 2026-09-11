import { WhatsAppInboundQueueMessage } from '@copas/contracts'

export type CloudflareBindings = {
  WHATSAPP_INBOUND_QUEUE: Queue<WhatsAppInboundQueueMessage>
  META_APP_SECRET: string
  META_VERIFY_TOKEN: string
  META_GRAPH_API_VERSION?: string
  META_GRAPH_API_BASE_URL?: string
}

export type AppEnv = {
  Bindings: CloudflareBindings
}

export type MetaWebhookEntry = {
  id: string
  changes: Array<{
    value: {
      metadata: {
        display_phone_number: string
        phone_number_id: string
      }
      contacts?: Array<{
        profile: {
          name: string
        }
        wa_id: string
        user_id?: string
      }>
      messages?: Array<{
        id: string
        from: string
        timestamp: string
        type: string
        text?: {
          body: string
        }
        image?: any
        document?: any
        audio?: any
        interactive?: any
        location?: any
        contacts?: any
      }>
      statuses?: Array<{
        id: string
        status: string
        timestamp: string
        recipient_id: string
        conversation?: any
        pricing?: any
        errors?: Array<{
          code: number
          title: string
          message?: string
          error_data?: any
        }>
      }>
    }
    field: string
  }>
}

export type MetaWebhookPayload = {
  object: string
  entry: MetaWebhookEntry[]
}
