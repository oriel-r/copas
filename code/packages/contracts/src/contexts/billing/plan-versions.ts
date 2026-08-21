import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { planVersions } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const planVersionsInsertSchema = createInsertSchema(planVersions, {
  id: optionalIdSchema,
})

export const planVersionsSelectSchema = createSelectSchema(planVersions, {
  id: () => uuidV7Schema,
})

export const planVersionsUpdateSchema = createUpdateSchema(planVersions, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createPlanVersionRequestSchema = planVersionsInsertSchema.omit(serverControlled)
export const updatePlanVersionRequestSchema = planVersionsUpdateSchema.omit(serverControlled)
export const planVersionResponseSchema = planVersionsSelectSchema

export type PlanVersion = z.infer<typeof planVersionsSelectSchema>
export type PlanVersionInsert = z.infer<typeof planVersionsInsertSchema>
export type PlanVersionUpdate = z.infer<typeof planVersionsUpdateSchema>
export type CreatePlanVersionRequest = z.infer<typeof createPlanVersionRequestSchema>
export type UpdatePlanVersionRequest = z.infer<typeof updatePlanVersionRequestSchema>
export type PlanVersionResponse = z.infer<typeof planVersionResponseSchema>