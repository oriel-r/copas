import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { subscriptionFeatureOverrides } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const subscriptionFeatureOverridesInsertSchema = createInsertSchema(subscriptionFeatureOverrides, {
  subscriptionId: optionalIdSchema,
  featureId: optionalIdSchema,
})

export const subscriptionFeatureOverridesSelectSchema = createSelectSchema(subscriptionFeatureOverrides, {
  subscriptionId: () => uuidV7Schema,
  featureId: () => uuidV7Schema,
})

export const subscriptionFeatureOverridesUpdateSchema = createUpdateSchema(subscriptionFeatureOverrides, {
  subscriptionId: () => uuidV7Schema,
  featureId: () => uuidV7Schema,
})

const serverControlled = {
  createdAt: true,
  updatedAt: true,
} as const

export const createSubscriptionFeatureOverrideRequestSchema = subscriptionFeatureOverridesInsertSchema.omit(serverControlled)
export const updateSubscriptionFeatureOverrideRequestSchema = subscriptionFeatureOverridesUpdateSchema.omit(serverControlled)
export const subscriptionFeatureOverrideResponseSchema = subscriptionFeatureOverridesSelectSchema

export type SubscriptionFeatureOverride = z.infer<typeof subscriptionFeatureOverridesSelectSchema>
export type SubscriptionFeatureOverrideInsert = z.infer<typeof subscriptionFeatureOverridesInsertSchema>
export type SubscriptionFeatureOverrideUpdate = z.infer<typeof subscriptionFeatureOverridesUpdateSchema>
export type CreateSubscriptionFeatureOverrideRequest = z.infer<typeof createSubscriptionFeatureOverrideRequestSchema>
export type UpdateSubscriptionFeatureOverrideRequest = z.infer<typeof updateSubscriptionFeatureOverrideRequestSchema>
export type SubscriptionFeatureOverrideResponse = z.infer<typeof subscriptionFeatureOverrideResponseSchema>