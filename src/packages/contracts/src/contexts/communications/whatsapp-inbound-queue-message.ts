import type { WhatsAppInboundMessageQueueMessage } from './whatsapp-inbound-message-queue-message'
import type { WhatsAppStatusUpdateQueueMessage } from './whatsapp-status-update-queue-message'

export type WhatsAppInboundQueueMessage =
  | WhatsAppInboundMessageQueueMessage
  | WhatsAppStatusUpdateQueueMessage
