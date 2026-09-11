import {
  WhatsAppInboundQueueMessage,
  WhatsAppInboundMessageQueueMessage,
  WhatsAppStatusUpdateQueueMessage
} from '@copas/contracts'
import { MetaWebhookPayload } from '../types/env'

export function normalizeMetaPayload(payload: MetaWebhookPayload): WhatsAppInboundQueueMessage[] {
  const messages: WhatsAppInboundQueueMessage[] = []

  if (!payload.entry) return messages

  for (const entry of payload.entry) {
    if (!entry.changes) continue
    for (const change of entry.changes) {
      if (!change.value) continue
      const value = change.value
      const phoneNumberId = value.metadata?.phone_number_id
      if (!phoneNumberId) continue

      if (value.messages && value.messages.length > 0) {
        for (const msg of value.messages) {
          const contact = value.contacts?.find((c: any) => c.wa_id === msg.from)
          
          let interactiveObj: any = undefined
          if (msg.type === 'interactive' && msg.interactive) {
            interactiveObj = { type: msg.interactive.type }
            if (msg.interactive.type === 'button_reply') {
              interactiveObj.buttonReply = msg.interactive.button_reply
            } else if (msg.interactive.type === 'list_reply') {
              interactiveObj.listReply = msg.interactive.list_reply
            } else if (msg.interactive.type === 'nfm_reply') {
              try {
                interactiveObj.flowReply = {
                  responseJson: JSON.parse(msg.interactive.nfm_reply.response_json || '{}'),
                  body: msg.interactive.nfm_reply.body
                }
              } catch (e) {
                interactiveObj.flowReply = {
                  responseJson: {},
                  body: msg.interactive.nfm_reply?.body
                }
              }
              interactiveObj.type = 'nfm_reply'
            }
          }

          let normalizedType = msg.type
          if (!['text', 'image', 'document', 'audio', 'interactive', 'location', 'contacts'].includes(msg.type)) {
            normalizedType = 'unknown'
          }

          const mediaNode = msg.image || msg.document || msg.audio || msg.location || msg.contacts
          let mediaObj: any = undefined
          if (mediaNode) {
            mediaObj = {
              id: mediaNode.id,
              mimeType: mediaNode.mime_type || ''
            }
            if (mediaNode.caption) mediaObj.caption = mediaNode.caption
            if (mediaNode.filename) mediaObj.filename = mediaNode.filename
            if (mediaNode.sha256) mediaObj.sha256 = mediaNode.sha256
          }

          const msgPayload: any = {
            wamid: msg.id,
            phoneNumberId: phoneNumberId,
            from: msg.from,
            timestamp: parseInt(msg.timestamp, 10),
            type: normalizedType
          }

          if (contact?.user_id) msgPayload.bsuid = contact.user_id
          if (contact?.profile?.name) {
            msgPayload.senderName = contact.profile.name
          }
          if (msg.text?.body) msgPayload.text = msg.text.body
          if (interactiveObj) msgPayload.interactive = interactiveObj
          if (mediaObj) msgPayload.media = mediaObj

          messages.push({
            type: 'whatsapp-inbound-message',
            metadata: {
              organizationId: 'system',
              idempotencyKey: 'inbound:msg:' + msg.id
            },
            payload: msgPayload
          })
        }
      }

      if (value.statuses && value.statuses.length > 0) {
        for (const status of value.statuses) {
          const statusPayload: any = {
            wamid: status.id,
            phoneNumberId: phoneNumberId,
            recipientPhone: status.recipient_id,
            status: status.status,
            timestamp: parseInt(status.timestamp, 10)
          }

          if ((status as any).recipient_user_id) {
            statusPayload.recipientUserId = (status as any).recipient_user_id
          } else if ((status as any).user_id) {
            statusPayload.recipientUserId = (status as any).user_id
          } else if ((status as any).customer_id) {
            statusPayload.recipientUserId = (status as any).customer_id
          } else if ((status as any).bsuid) {
            statusPayload.recipientUserId = (status as any).bsuid
          }

          if (status.errors && status.errors.length > 0) {
            statusPayload.errors = status.errors.map((err: any) => ({
              code: err.code,
              title: err.title,
              message: err.message,
              errorData: err.error_data
            }))
          }

          messages.push({
            type: 'whatsapp-status-update',
            metadata: {
              organizationId: 'system',
              idempotencyKey: 'inbound:status:' + status.id + ':' + status.status
            },
            payload: statusPayload
          })
        }
      }
    }
  }

  return messages
}
