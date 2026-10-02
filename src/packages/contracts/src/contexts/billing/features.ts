import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { features } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const featuresInsertSchema = createInsertSchema(features, {
  id: optionalIdSchema,
})

export const featuresSelectSchema = createSelectSchema(features, {
  id: () => uuidV7Schema,
})

export const featuresUpdateSchema = createUpdateSchema(features, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createFeatureRequestSchema = featuresInsertSchema.omit(serverControlled)
export const updateFeatureRequestSchema = featuresUpdateSchema.omit(serverControlled)
export const featureResponseSchema = featuresSelectSchema

export type Feature = z.infer<typeof featuresSelectSchema>
export type FeatureInsert = z.infer<typeof featuresInsertSchema>
export type FeatureUpdate = z.infer<typeof featuresUpdateSchema>
export type CreateFeatureRequest = z.infer<typeof createFeatureRequestSchema>
export type UpdateFeatureRequest = z.infer<typeof updateFeatureRequestSchema>
export type FeatureResponse = z.infer<typeof featureResponseSchema>