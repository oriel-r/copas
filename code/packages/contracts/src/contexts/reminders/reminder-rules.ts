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

export const createReminderRuleRequestSchema = reminderRulesInsertSchema.omit(serverControlled)
export const updateReminderRuleRequestSchema = reminderRulesUpdateSchema.omit(serverControlled)
export const reminderRuleResponseSchema = reminderRulesSelectSchema

export type ReminderRule = z.infer<typeof reminderRulesSelectSchema>
export type ReminderRuleInsert = z.infer<typeof reminderRulesInsertSchema>
export type ReminderRuleUpdate = z.infer<typeof reminderRulesUpdateSchema>
export type CreateReminderRuleRequest = z.infer<typeof createReminderRuleRequestSchema>
export type UpdateReminderRuleRequest = z.infer<typeof updateReminderRuleRequestSchema>
export type ReminderRuleResponse = z.infer<typeof reminderRuleResponseSchema>