import { Hono } from 'hono'
import { AppEnv } from '../types/env'
import { verifyMetaSignature } from './hmac'
import { normalizeMetaPayload } from './normalizer'

export const app = new Hono<{ Bindings: AppEnv['Bindings'] }>()

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'whatsapp-service' })
})

app.get('/webhooks/whatsapp', (c) => {
  const mode = c.req.query('hub.mode')
  const token = c.req.query('hub.verify_token')
  const challenge = c.req.query('hub.challenge')

  if (mode === 'subscribe' && token === c.env.META_VERIFY_TOKEN) {
    return c.text(challenge || '')
  }

  return c.text('Forbidden', 403)
})

app.post('/webhooks/whatsapp', async (c) => {
  const signature = c.req.header('X-Hub-Signature-256')
  const rawBody = await c.req.arrayBuffer()

  const isValid = await verifyMetaSignature(rawBody, signature, c.env.META_APP_SECRET)
  if (!isValid) {
    return c.json({ error: 'Invalid signature' }, 401)
  }

  const textDecoder = new TextDecoder()
  const textBody = textDecoder.decode(rawBody)
  let payload
  try {
    payload = JSON.parse(textBody)
  } catch (e) {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const messages = normalizeMetaPayload(payload)
  
  if (messages.length > 0) {
    try {
      await c.env.WHATSAPP_INBOUND_QUEUE.sendBatch(
        messages.map((body) => ({ body }))
      )
    } catch (e) {
      return c.json({ error: 'Failed to queue messages' }, 500)
    }
  }

  return c.json({ success: true })
})
