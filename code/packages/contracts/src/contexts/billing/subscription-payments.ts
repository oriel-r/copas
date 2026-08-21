import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { subscriptionPayments } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const subscriptionPaymentsInsertSchema = createInsertSchema(subscriptionPayments, {
  id: optionalIdSchema,
})

export const subscriptionPaymentsSelectSchema = createSelectSchema(subscriptionPayments, {
  id: () => uuidV7Schema,
})

export const subscriptionPaymentsUpdateSchema = createUpdateSchema(subscriptionPayments, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createSubscriptionPaymentRequestSchema = subscriptionPaymentsInsertSchema.omit(serverControlled)
export const updateSubscriptionPaymentRequestSchema = subscriptionPaymentsUpdateSchema.omit(serverControlled)
export const subscriptionPaymentResponseSchema = subscriptionPaymentsSelectSchema

export type SubscriptionPayment = z.infer<typeof subscriptionPaymentsSelectSchema>
export type SubscriptionPaymentInsert = z.infer<typeof subscriptionPaymentsInsertSchema>
export type SubscriptionPaymentUpdate = z.infer<typeof subscriptionPaymentsUpdateSchema>
export type CreateSubscriptionPaymentRequest = z.infer<typeof createSubscriptionPaymentRequestSchema>
export type UpdateSubscriptionPaymentRequest = z.infer<typeof updateSubscriptionPaymentRequestSchema>
export type SubscriptionPaymentResponse = z.infer<typeof subscriptionPaymentResponseSchema>