import type { Envelope } from '../../shared/queue'

export type WhatsAppInboundMedia = {
  id: string
  mimeType: string
  sha256?: string
  caption?: string
  filename?: string
}

export type WhatsAppInboundInteractive = {
  type: 'button_reply' | 'list_reply' | 'nfm_reply'
  buttonReply?: {
    id: string
    title: string
  }
  listReply?: {
    id: string
    title: string
    description?: string
  }
  flowReply?: {
    responseJson: Record<string, unknown>
    body?: string
  }
}

export type WhatsAppInboundMessagePayload = {
  wamid: string
  phoneNumberId: string
  from: string
  bsuid?: string
  username?: string
  senderName?: string
  timestamp: number
  type:
    | 'text'
    | 'image'
    | 'document'
    | 'audio'
    | 'interactive'
    | 'location'
    | 'contacts'
    | 'unknown'
  text?: string
  media?: WhatsAppInboundMedia
  interactive?: WhatsAppInboundInteractive
}

export type WhatsAppInboundMessageQueueMessage =
  Envelope<WhatsAppInboundMessagePayload> & {
    type: 'whatsapp-inbound-message'
  }
