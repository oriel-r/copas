import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { reminderRules } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const reminderRulesInsertSchema = createInsertSchema(reminderRules, {
  id: optionalIdSchema,
})

export const reminderRulesSelectSchema = createSelectSchema(reminderRules, {
  id: () => uuidV7Schema,
})

export const reminderRulesUpdateSchema = createUpdateSchema(reminderRules, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const REMINDER_EVENT_PRESETS = [
  {
    eventSource: 'installment_due',
    offsetDays: -3,
    name: 'Aviso previo de vencimiento (3 días antes)',
    description: 'Recuerda al asegurado el vencimiento de su cuota con 3 días de anticipación.',
  },
  {
    eventSource: 'installment_due',
    offsetDays: 0,
    name: 'Día de vencimiento',
    description: 'Notifica al asegurado el día exacto en que vence su cuota.',
  },
  {
    eventSource: 'policy_expiration',
    offsetDays: -3,
    name: 'Aviso previo de renovación (3 días antes)',
    description: 'Avisa al asegurado que su póliza finalizará su vigencia en 3 días para coordinar renovación.',
  },
  {
    eventSource: 'policy_expiration',
    offsetDays: 0,
    name: 'Día de renovación de póliza',
    description: 'Avisa al asegurado el día exacto de finalización de vigencia de su póliza.',
  },
] as const

export const reminderOffsetDaysSchema = z.number().int().min(-30).max(30)

export const createReminderRuleRequestSchema = reminderRulesInsertSchema
  .omit(serverControlled)
  .extend({
    offsetDays: reminderOffsetDaysSchema,
  })

export const updateReminderRuleRequestSchema = reminderRulesUpdateSchema
  .omit(serverControlled)
  .extend({
    offsetDays: reminderOffsetDaysSchema.optional(),
  })

export const reminderRuleResponseSchema = reminderRulesSelectSchema

export type ReminderRule = z.infer<typeof reminderRulesSelectSchema>
export type ReminderRuleInsert = z.infer<typeof reminderRulesInsertSchema>
export type ReminderRuleUpdate = z.infer<typeof reminderRulesUpdateSchema>
export type CreateReminderRuleRequest = z.infer<typeof createReminderRuleRequestSchema>
export type UpdateReminderRuleRequest = z.infer<typeof updateReminderRuleRequestSchema>
export type ReminderRuleResponse = z.infer<typeof reminderRuleResponseSchema>
export type ReminderEventPreset = (typeof REMINDER_EVENT_PRESETS)[number]