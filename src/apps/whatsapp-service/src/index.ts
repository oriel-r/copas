import { app } from './webhook/routes'
import { queue } from './consumer/handler'
import { getLogger } from '@copas/logger'

export { app, queue }

export default {
  fetch: app.fetch,
  queue
}
