import type { Envelope } from '../../shared/queue'

export type WhatsAppTemplateComponentParameter = {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document'
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
}

export type WhatsAppTemplateComponent = {
  type: 'header' | 'body' | 'button'
  subType?: 'quick_reply' | 'url'
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

export type WhatsAppOutboundQueuePayload = {
  messageId: string
  conversationId: string
  organizationId: string
  organizationChannelEndpointId: string
  phoneNumberId: string
  to: string // Número E.164 o BSUID de Meta
  mode: 'template' | 'free_form' | 'reaction' | 'contact'
  template?: WhatsAppTemplatePayload
  text?: string
  reaction?: WhatsAppReactionPayload
  contact?: WhatsAppContactCard
  credentials: {
    accessToken: string
    wabaId?: string
  }
}

export type WhatsAppOutboundQueueMessage = Envelope<WhatsAppOutboundQueuePayload> & {
  type: 'whatsapp-outbound'
}
