import { Hono } from 'hono'
import { validator } from 'hono/validator'
import type { AppEnv } from '../../core/types/env'
import {
  remindersDueQuerySchema,
  reminderExecutionParamsSchema,
  installmentReminderParamsSchema,
  type ReminderDispatchSummary,
  type InstallmentReminderResult,
  getTodayArgentina,
  ReminderInstallmentNotFoundError,
  ReminderAlreadySentError,
  NoActiveReminderRuleError
} from '@copas/contracts'

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
  .post(
    '/executions',
    validator('json', (value, c) => {
      const parsed = reminderExecutionParamsSchema.safeParse(value)
      if (!parsed.success) {
        return c.json({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid params' }, 400)
      }
      return parsed.data
    }),
    async (c) => {
      const orgId = c.get('organizationId' as any)
      if (!orgId) return c.json({ error: 'Organization required' }, 401)

      const orchestrator =
        c.get('services')?.reminders?.orchestrator ??
        (c.get('services') as any)?.remindersOrchestrator

      const data = c.req.valid('json')
      const result: ReminderDispatchSummary = await orchestrator.dispatchDueRemindersForOrg({
        organizationId: orgId,
        scheduledDate: data.scheduledDate || getTodayArgentina(),
        fromView: true,
      })
      return c.json(result, 201)
    },
  )
  .post(
    '/installments/:id',
    validator('json', (value, c) => {
      const parsed = installmentReminderParamsSchema.safeParse(value)
      if (!parsed.success) {
        return c.json({ error: 'Bad Request', message: parsed.error.issues[0]?.message || 'Invalid params' }, 400)
      }
      return parsed.data
    }),
    async (c) => {
      const orgId = c.get('organizationId' as any)
      if (!orgId) return c.json({ error: 'Organization required' }, 401)

      const id = c.req.param('id')
      const data = c.req.valid('json')
      const orchestrator =
        c.get('services')?.reminders?.orchestrator ??
        (c.get('services') as any)?.remindersOrchestrator

      try {
        const result: InstallmentReminderResult = await orchestrator.dispatchInstallmentReminder(id, {
          forceResend: data.forceResend,
          scheduledDate: data.scheduledDate,
          organizationId: orgId
        })
        return c.json(result, 201)
      } catch (e: any) {
        if (e instanceof ReminderInstallmentNotFoundError || e.code === 'NOT_FOUND' || e.message.includes('Cuota no encontrada')) {
          return c.json({ error: 'Not Found', message: e.message }, 404)
        }
        if (e instanceof ReminderAlreadySentError || e.code === 'ALREADY_SENT' || e.message.includes('ya enviado')) {
          return c.json({ error: 'Conflict', message: e.message }, 409)
        }
        if (e instanceof NoActiveReminderRuleError || e.code === 'NO_ACTIVE_RULE' || e.message.includes('No existe regla')) {
          return c.json({ error: 'Unprocessable Entity', message: e.message }, 422)
        }
        throw e
      }
    },
  )

