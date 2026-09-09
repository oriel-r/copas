import { z } from 'zod'

export const remindersDueQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
    .optional(),
  eventSource: z.enum(['installment_due', 'policy_expiration']).optional(),
})

export const reminderDueItemSchema = z.object({
  ruleId: z.string(),
  eventSource: z.enum(['installment_due', 'policy_expiration']),
  offsetDays: z.number(),
  targetDate: z.string(),
  entityId: z.string(),
  policyId: z.string(),
  policyNumber: z.string().nullable(),
  insuredId: z.string(),
  insuredFullName: z.string(),
  insuredPhone: z.string().nullable(),
  companyName: z.string(),
  totalAmount: z.number().nullable(),
  currency: z.string().nullable(),
  installmentNumber: z.number().nullable(),
  dueDate: z.string().nullable(),
  expirationDate: z.string().nullable(),
  isOptedOut: z.boolean(),
  canDeliver: z.boolean(),
  skipReason: z.string().nullable(),
})

export const remindersDueResponseSchema = z.object({
  date: z.string(),
  totalDue: z.number(),
  items: z.array(reminderDueItemSchema),
})

export type RemindersDueQuery = z.infer<typeof remindersDueQuerySchema>
export type ReminderDueItem = z.infer<typeof reminderDueItemSchema>
export type RemindersDueResponse = z.infer<typeof remindersDueResponseSchema>
