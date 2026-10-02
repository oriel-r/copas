import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { plans } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const plansInsertSchema = createInsertSchema(plans, {
  id: optionalIdSchema,
})

export const plansSelectSchema = createSelectSchema(plans, {
  id: () => uuidV7Schema,
})

export const plansUpdateSchema = createUpdateSchema(plans, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createPlanRequestSchema = plansInsertSchema.omit(serverControlled)
export const updatePlanRequestSchema = plansUpdateSchema.omit(serverControlled)
export const planResponseSchema = plansSelectSchema

export type Plan = z.infer<typeof plansSelectSchema>
export type PlanInsert = z.infer<typeof plansInsertSchema>
export type PlanUpdate = z.infer<typeof plansUpdateSchema>
export type CreatePlanRequest = z.infer<typeof createPlanRequestSchema>
export type UpdatePlanRequest = z.infer<typeof updatePlanRequestSchema>
export type PlanResponse = z.infer<typeof planResponseSchema>