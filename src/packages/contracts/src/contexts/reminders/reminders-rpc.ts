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

export const reminderExecutionParamsSchema = z.object({
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'scheduledDate must be in YYYY-MM-DD format')
    .optional(),
})

export const installmentReminderParamsSchema = z.object({
  forceResend: z.boolean().default(false),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'scheduledDate must be in YYYY-MM-DD format')
    .optional(),
})

export const installmentReminderResultSchema = z.object({
  installmentId: z.string(),
  ruleId: z.string(),
  deduplicationHash: z.string(),
  status: z.enum(['enqueued', 'skipped', 'already_sent', 'failed']),
  messageId: z.string().nullable().optional(),
  skipReason: z.string().nullable().optional(),
  error: z.string().optional(),
})

export type ReminderExecutionParams = z.infer<typeof reminderExecutionParamsSchema>
export type InstallmentReminderParams = z.infer<typeof installmentReminderParamsSchema>
export type InstallmentReminderResult = z.infer<typeof installmentReminderResultSchema>

export class ReminderInstallmentNotFoundError extends Error {
  readonly code = 'NOT_FOUND'
  constructor(message = 'Cuota no encontrada o perteneciente a otra organización') {
    super(message)
    this.name = 'ReminderInstallmentNotFoundError'
  }
}

export class ReminderAlreadySentError extends Error {
  readonly code = 'ALREADY_SENT'
  constructor(message = 'Recordatorio ya enviado en la fecha (requiere forceResend: true)') {
    super(message)
    this.name = 'ReminderAlreadySentError'
  }
}

export class NoActiveReminderRuleError extends Error {
  readonly code = 'NO_ACTIVE_RULE'
  constructor(message = 'No existe regla de recordatorio activa para la cuota') {
    super(message)
    this.name = 'NoActiveReminderRuleError'
  }
}

