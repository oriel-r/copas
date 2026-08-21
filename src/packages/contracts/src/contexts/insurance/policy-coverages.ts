import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { policyCoverages } from '@copas/db'

import {
  jsonObjectSchema,
  nullableJsonSchema,
  optionalIdSchema,
  requiredIdSchema,
  uuidV7Schema,
} from '../../shared'

export const policyCoveragesInsertSchema = createInsertSchema(policyCoverages, {
  id: optionalIdSchema,
  policyId: requiredIdSchema,
  data: nullableJsonSchema,
})

export const policyCoveragesSelectSchema = createSelectSchema(policyCoverages, {
  id: () => uuidV7Schema,
  policyId: () => uuidV7Schema,
  data: () => jsonObjectSchema,
})

export const policyCoveragesUpdateSchema = createUpdateSchema(policyCoverages, {
  id: () => uuidV7Schema,
  policyId: () => uuidV7Schema,
  data: () => jsonObjectSchema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createPolicyCoverageRequestSchema = policyCoveragesInsertSchema.omit(
  serverControlled,
)
export const updatePolicyCoverageRequestSchema = policyCoveragesUpdateSchema.omit(
  serverControlled,
)
export const policyCoverageResponseSchema = policyCoveragesSelectSchema

export type PolicyCoverage = z.infer<typeof policyCoveragesSelectSchema>
export type PolicyCoverageInsert = z.infer<typeof policyCoveragesInsertSchema>
export type PolicyCoverageUpdate = z.infer<typeof policyCoveragesUpdateSchema>
export type CreatePolicyCoverageRequest = z.infer<
  typeof createPolicyCoverageRequestSchema
>
export type UpdatePolicyCoverageRequest = z.infer<
  typeof updatePolicyCoverageRequestSchema
>
export type PolicyCoverageResponse = z.infer<typeof policyCoverageResponseSchema>