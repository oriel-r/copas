import type { Envelope } from '../../shared/queue'

export type WhatsAppTemplateComponentParameter = {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'action'
  text?: string
  currency?: {
    fallback_value: string
    code: string
    amount_1000: number
  }
  dateTime?: {
    fallback_value: string
  }
  image?: {
    link: string
  }
  document?: {
    link: string
    filename?: string
  }
  action?: {
    flow_token?: string
    flow_action_data?: Record<string, unknown>
  }
}

export type WhatsAppTemplateComponent = {
  type: 'header' | 'body' | 'button'
  subType?: 'quick_reply' | 'url' | 'flow'
  index?: number
  parameters: WhatsAppTemplateComponentParameter[]
}

export type WhatsAppTemplatePayload = {
  name: string
  language: {
    code: string
  }
  components?: WhatsAppTemplateComponent[]
}

export type WhatsAppContactCard = {
  name: {
    formatted_name: string
    first_name?: string
    last_name?: string
  }
  phones: Array<{
    phone: string
    type?: string
  }>
  emails?: Array<{
    email: string
    type?: string
  }>
}

export type WhatsAppReactionPayload = {
  messageId: string
  emoji: string
}

export type WhatsAppInteractivePayload = {
  type: 'flow' | 'button' | 'list'
  header?: {
    type: 'text' | 'image' | 'document' | 'video'
    text?: string
    image?: { link: string }
    document?: { link: string; filename?: string }
  }
  body: {
    text: string
  }
  footer?: {
    text: string
  }
  action: {
    name?: 'flow'
    parameters?: {
      flow_message_version: '3'
      flow_token: string
      flow_id: string
      flow_cta: string
      flow_action: 'navigate' | 'data_exchange'
      flow_action_payload?: {
        screen: string
        data?: Record<string, unknown>
      }
    }
    buttons?: Array<{
      type: 'reply'
      reply: { id: string; title: string }
    }>
  }
}

export type WhatsAppOutboundQueuePayload = {
  messageId: string
  conversationId: string
  organizationId: string
  organizationChannelEndpointId: string
  phoneNumberId: string
  to: string // Número E.164 o BSUID de Meta
  mode: 'template' | 'free_form' | 'reaction' | 'contact' | 'interactive'
  template?: WhatsAppTemplatePayload
  text?: string
  reaction?: WhatsAppReactionPayload
  contact?: WhatsAppContactCard
  interactive?: WhatsAppInteractivePayload
  credentials: {
    accessToken: string
    wabaId?: string
  }
}

export type WhatsAppOutboundQueueMessage = Envelope<WhatsAppOutboundQueuePayload> & {
  type: 'whatsapp-outbound'
}
