import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { subscriptions } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const subscriptionsInsertSchema = createInsertSchema(subscriptions, {
  id: optionalIdSchema,
})

export const subscriptionsSelectSchema = createSelectSchema(subscriptions, {
  id: () => uuidV7Schema,
})

export const subscriptionsUpdateSchema = createUpdateSchema(subscriptions, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createSubscriptionRequestSchema = subscriptionsInsertSchema.omit(serverControlled)
export const updateSubscriptionRequestSchema = subscriptionsUpdateSchema.omit(serverControlled)
export const subscriptionResponseSchema = subscriptionsSelectSchema

export type Subscription = z.infer<typeof subscriptionsSelectSchema>
export type SubscriptionInsert = z.infer<typeof subscriptionsInsertSchema>
export type SubscriptionUpdate = z.infer<typeof subscriptionsUpdateSchema>
export type CreateSubscriptionRequest = z.infer<typeof createSubscriptionRequestSchema>
export type UpdateSubscriptionRequest = z.infer<typeof updateSubscriptionRequestSchema>
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>