import type { Envelope } from '../../shared/queue'

export type EmailQueuePayload = {
  notificationId: string
  recipientEmail: string
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  tags?: Record<string, string>
}

export type EmailQueueMessage = Envelope<EmailQueuePayload> & {
  type: 'email-dispatch'
}
