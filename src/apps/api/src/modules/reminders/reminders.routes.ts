import { Hono } from 'hono'
import type { AppEnv } from '../../core/types/env'
import { remindersDueQuerySchema } from '@copas/contracts'

export const remindersRouter = new Hono<AppEnv>()
  .get('/due', async (c) => {
    const date = c.req.query('date')
    const eventSource = c.req.query('eventSource')

    const parsed = remindersDueQuerySchema.safeParse({
      date: date || undefined,
      eventSource: eventSource || undefined,
    })

    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid query' }, 400)
    }

    const orchestrator =
      c.get('services')?.reminders?.orchestrator ??
      (c.get('services') as any)?.remindersOrchestrator

    const preview = await orchestrator.getDueRemindersPreview(parsed.data)
    return c.json(preview)
  })
