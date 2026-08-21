import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { planVersionFeatures } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const planVersionFeaturesInsertSchema = createInsertSchema(planVersionFeatures, {
  planVersionId: optionalIdSchema,
  featureId: optionalIdSchema,
})

export const planVersionFeaturesSelectSchema = createSelectSchema(planVersionFeatures, {
  planVersionId: () => uuidV7Schema,
  featureId: () => uuidV7Schema,
})

export const planVersionFeaturesUpdateSchema = createUpdateSchema(planVersionFeatures, {
  planVersionId: () => uuidV7Schema,
  featureId: () => uuidV7Schema,
})

const serverControlled = {
  createdAt: true,
  updatedAt: true,
} as const

export const createPlanVersionFeatureRequestSchema = planVersionFeaturesInsertSchema.omit(serverControlled)
export const updatePlanVersionFeatureRequestSchema = planVersionFeaturesUpdateSchema.omit(serverControlled)
export const planVersionFeatureResponseSchema = planVersionFeaturesSelectSchema

export type PlanVersionFeature = z.infer<typeof planVersionFeaturesSelectSchema>
export type PlanVersionFeatureInsert = z.infer<typeof planVersionFeaturesInsertSchema>
export type PlanVersionFeatureUpdate = z.infer<typeof planVersionFeaturesUpdateSchema>
export type CreatePlanVersionFeatureRequest = z.infer<typeof createPlanVersionFeatureRequestSchema>
export type UpdatePlanVersionFeatureRequest = z.infer<typeof updatePlanVersionFeatureRequestSchema>
export type PlanVersionFeatureResponse = z.infer<typeof planVersionFeatureResponseSchema>