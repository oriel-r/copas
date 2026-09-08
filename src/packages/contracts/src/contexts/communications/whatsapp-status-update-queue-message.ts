import type { Envelope } from '../../shared/queue'

export type WhatsAppStatusError = {
  code: number
  title: string
  message?: string
  errorData?: Record<string, unknown>
}

export type WhatsAppStatusUpdatePayload = {
  wamid: string
  phoneNumberId: string
  recipientPhone: string
  recipientUserId?: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: number
  errors?: WhatsAppStatusError[]
}

export type WhatsAppStatusUpdateQueueMessage =
  Envelope<WhatsAppStatusUpdatePayload> & {
    type: 'whatsapp-status-update'
  }
