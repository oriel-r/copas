import { Hono } from 'hono'
import type { AppEnv } from '../../../core/types/env'
import { createReminderRuleRequestSchema, updateReminderRuleRequestSchema } from '@copas/contracts'

const getRulesService = (c: any) =>
  c.get('services')?.reminders?.rules ?? c.get('services')?.reminderRulesService

export const reminderRulesRouter = new Hono<AppEnv>()
  .get('/', async (c) => {
    const rules = await getRulesService(c).listRules()
    return c.json({ data: rules })
  })
  .post('/', async (c) => {
    const body = await c.req.json()
    const result = createReminderRuleRequestSchema.safeParse(body)
    if (!result.success) {
      return c.json({ error: 'Bad Request', details: result.error.issues }, 400)
    }

    try {
      const rule = await getRulesService(c).createRule(result.data)
      return c.json({ data: rule }, 201)
    } catch (e: any) {
      if (e.message.includes('offsetDays must be')) {
        return c.json({ error: 'Bad Request', message: e.message }, 400)
      }
      throw e
    }
  })
  .get('/:id', async (c) => {
    const rule = await getRulesService(c).getRuleById(c.req.param('id'))
    if (!rule) return c.json({ error: 'Not Found' }, 404)
    return c.json({ data: rule })
  })
  .patch('/:id', async (c) => {
    const body = await c.req.json()
    const result = updateReminderRuleRequestSchema.safeParse(body)
    if (!result.success) {
      return c.json({ error: 'Bad Request', details: result.error.issues }, 400)
    }

    try {
      const rule = await getRulesService(c).updateRule(c.req.param('id'), result.data)
      return c.json({ data: rule })
    } catch (e: any) {
      if (e.message === 'Rule not found') return c.json({ error: 'Not Found' }, 404)
      if (e.message.includes('offsetDays must be')) return c.json({ error: 'Bad Request', message: e.message }, 400)
      throw e
    }
  })
  .delete('/:id', async (c) => {
    const deleted = await getRulesService(c).deleteRule(c.req.param('id'))
    if (!deleted) return c.json({ error: 'Not Found' }, 404)
    return c.json({ success: true })
  })
