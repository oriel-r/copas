import { z } from 'zod'

export const reminderDispatchParamsSchema = z.object({
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'scheduledDate must be in YYYY-MM-DD format'),
})

export const reminderDispatchResultItemSchema = z.object({
  organizationId: z.string(),
  ruleId: z.string(),
  eventSource: z.enum(['installment_due', 'policy_expiration']),
  entityId: z.string(),
  deduplicationHash: z.string(),
  status: z.enum(['enqueued', 'skipped', 'already_sent', 'failed']),
  skipReason: z.string().optional(),
  messageId: z.string().optional(),
  error: z.string().optional(),
})

export const reminderDispatchSummarySchema = z.object({
  scheduledDate: z.string(),
  totalEvaluated: z.number(),
  totalEnqueued: z.number(),
  totalSkipped: z.number(),
  totalAlreadySent: z.number(),
  errors: z.array(z.string()),
  results: z.array(reminderDispatchResultItemSchema).optional(),
})

export type ReminderDispatchParams = z.infer<typeof reminderDispatchParamsSchema>
export type ReminderDispatchResultItem = z.infer<typeof reminderDispatchResultItemSchema>
export type ReminderDispatchSummary = z.infer<typeof reminderDispatchSummarySchema>
