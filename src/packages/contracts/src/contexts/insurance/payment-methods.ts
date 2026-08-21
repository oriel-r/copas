import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { paymentMethods } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const paymentMethodsInsertSchema = createInsertSchema(paymentMethods, {
  id: optionalIdSchema,
})

export const paymentMethodsSelectSchema = createSelectSchema(paymentMethods, {
  id: () => uuidV7Schema,
})

export const paymentMethodsUpdateSchema = createUpdateSchema(paymentMethods, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createPaymentMethodRequestSchema = paymentMethodsInsertSchema.omit(
  serverControlled,
)
export const updatePaymentMethodRequestSchema = paymentMethodsUpdateSchema.omit(
  serverControlled,
)
export const paymentMethodResponseSchema = paymentMethodsSelectSchema

export type PaymentMethod = z.infer<typeof paymentMethodsSelectSchema>
export type PaymentMethodInsert = z.infer<typeof paymentMethodsInsertSchema>
export type PaymentMethodUpdate = z.infer<typeof paymentMethodsUpdateSchema>
export type CreatePaymentMethodRequest = z.infer<
  typeof createPaymentMethodRequestSchema
>
export type UpdatePaymentMethodRequest = z.infer<
  typeof updatePaymentMethodRequestSchema
>
export type PaymentMethodResponse = z.infer<typeof paymentMethodResponseSchema>