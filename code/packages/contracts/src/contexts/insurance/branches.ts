import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { branches } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const branchesInsertSchema = createInsertSchema(branches, {
  id: optionalIdSchema,
})

export const branchesSelectSchema = createSelectSchema(branches, {
  id: () => uuidV7Schema,
})

export const branchesUpdateSchema = createUpdateSchema(branches, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createBranchRequestSchema = branchesInsertSchema.omit(serverControlled)
export const updateBranchRequestSchema = branchesUpdateSchema.omit(serverControlled)
export const branchResponseSchema = branchesSelectSchema

export type Branch = z.infer<typeof branchesSelectSchema>
export type BranchInsert = z.infer<typeof branchesInsertSchema>
export type BranchUpdate = z.infer<typeof branchesUpdateSchema>
export type CreateBranchRequest = z.infer<typeof createBranchRequestSchema>
export type UpdateBranchRequest = z.infer<typeof updateBranchRequestSchema>
export type BranchResponse = z.infer<typeof branchResponseSchema>