import { AppEnv } from '../types/env'
import { WhatsAppOutboundQueueMessage } from '@copas/contracts'
import { WhatsAppStatusUpdateQueueMessage } from '@copas/contracts'
import { sendMetaMessage } from '../meta/client'

export async function queue(
  batch: MessageBatch<WhatsAppOutboundQueueMessage>,
  env: AppEnv['Bindings'],
  ctx: ExecutionContext
) {
  for (const msg of batch.messages) {
    try {
      const payload = msg.body.payload
      const response = await sendMetaMessage(payload, env)

      if (response.ok) {
        msg.ack()
      } else if (response.status === 429 || response.status >= 500) {
        msg.retry()
      } else if (response.status >= 400 && response.status < 500) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch (e) {
          // ignore
        }
        
        const metaError = errorData.error || {}
        
        const failedStatus: WhatsAppStatusUpdateQueueMessage = {
          type: 'whatsapp-status-update',
          metadata: {
            organizationId: payload.organizationId || 'system',
            idempotencyKey: 'failed-dispatch:' + payload.messageId
          },
          payload: {
            wamid: 'failed:' + payload.messageId,
            phoneNumberId: payload.phoneNumberId,
            recipientPhone: payload.to,
            status: 'failed',
            timestamp: Math.floor(Date.now() / 1000),
            errors: [{
              code: metaError.code || response.status,
              title: metaError.type || 'MetaGraphApiError',
              message: metaError.message || `HTTP ${response.status}`,
              errorData: metaError.error_data
            }]
          }
        }

        try {
          await env.WHATSAPP_INBOUND_QUEUE.send(failedStatus)
        } catch (e) {
          // ignore
        }
        
        msg.ack()
      } else {
        msg.retry()
      }
    } catch (e) {
      msg.retry()
    }
  }
}
