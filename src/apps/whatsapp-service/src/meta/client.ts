import { AppEnv } from '../types/env'
import { WhatsAppOutboundQueuePayload } from '@copas/contracts'

export async function sendMetaMessage(payload: WhatsAppOutboundQueuePayload, env: AppEnv['Bindings']) {
  const baseUrl = env.META_GRAPH_API_BASE_URL || 'https://graph.facebook.com'
  const version = env.META_GRAPH_API_VERSION || 'v20.0'
  const url = `${baseUrl}/${version}/${payload.phoneNumberId}/messages`
  
  const headers = {
    'Authorization': `Bearer ${payload.credentials.accessToken}`,
    'Content-Type': 'application/json'
  }

  let body: any = {
    messaging_product: 'whatsapp',
    to: payload.to,
  }

  if (payload.mode === 'template' && payload.template) {
    body.type = 'template'
    body.template = payload.template
  } else if (payload.mode === 'free_form' && payload.text) {
    body.type = 'text'
    body.text = { preview_url: false, body: payload.text }
  } else if (payload.mode === 'reaction' && payload.reaction) {
    body.type = 'reaction'
    body.reaction = { message_id: payload.reaction.messageId, emoji: payload.reaction.emoji }
  } else if (payload.mode === 'contact' && payload.contact) {
    body.type = 'contacts'
    body.contacts = [payload.contact]
  } else if (payload.mode === 'interactive' && payload.interactive) {
    body.type = 'interactive'
    body.interactive = payload.interactive
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  return response
}
