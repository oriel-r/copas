import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { communicationCategories } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const communicationCategoriesInsertSchema = createInsertSchema(communicationCategories, {
  id: optionalIdSchema,
})

export const communicationCategoriesSelectSchema = createSelectSchema(communicationCategories, {
  id: () => uuidV7Schema,
})

export const communicationCategoriesUpdateSchema = createUpdateSchema(communicationCategories, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createCommunicationCategoryRequestSchema = communicationCategoriesInsertSchema.omit(serverControlled)
export const updateCommunicationCategoryRequestSchema = communicationCategoriesUpdateSchema.omit(serverControlled)
export const communicationCategoryResponseSchema = communicationCategoriesSelectSchema

export type CommunicationCategory = z.infer<typeof communicationCategoriesSelectSchema>
export type CommunicationCategoryInsert = z.infer<typeof communicationCategoriesInsertSchema>
export type CommunicationCategoryUpdate = z.infer<typeof communicationCategoriesUpdateSchema>
export type CreateCommunicationCategoryRequest = z.infer<typeof createCommunicationCategoryRequestSchema>
export type UpdateCommunicationCategoryRequest = z.infer<typeof updateCommunicationCategoryRequestSchema>
export type CommunicationCategoryResponse = z.infer<typeof communicationCategoryResponseSchema>