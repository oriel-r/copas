import { app } from './webhook/routes'
import { queue } from './consumer/handler'
import { getLogger } from '@copas/logger'

/**
 * WhatsApp Service Worker
 * Stateless adapter for Meta Cloud API integration (Webhooks ingestion & Outbound queue consumer).
 */
export { app, queue }

export default {
  fetch: app.fetch,
  queue
}
