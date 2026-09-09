import { Hono } from 'hono'
import type { ScheduledController, ExecutionContext } from '@cloudflare/workers-types'
import type { ReminderDispatchSummary } from '@copas/contracts'

export interface SchedulerEnv {
  API: {
    dispatchDueReminders: (params: { scheduledDate: string }) => Promise<ReminderDispatchSummary>
  }
  NODE_ENV?: string
}

export function getTodayArgentina(timestamp?: number): string {
  const d = timestamp ? new Date(timestamp) : new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(d)
}

const app = new Hono<{ Bindings: SchedulerEnv }>()

app.get('/health', (c) => c.json({ service: 'scheduler', status: 'ok' }))

app.post('/trigger', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const date = body.date || getTodayArgentina()
  const result = await c.env.API.dispatchDueReminders({ scheduledDate: date })
  return c.json(result)
})

const handler = {
  fetch: app.fetch.bind(app),
  async scheduled(event: ScheduledController, env: SchedulerEnv, ctx: ExecutionContext): Promise<void> {
    const today = getTodayArgentina(event.scheduledTime)
    const promise = env.API.dispatchDueReminders({ scheduledDate: today })
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(promise.catch(() => {})) // Ignore unhandled rejection inside waitUntil to prevent duplicate throws
    }
    await promise
  },
}

export default handler
