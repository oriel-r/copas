import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { aiExtractionResults } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const aiExtractionResultsInsertSchema = createInsertSchema(aiExtractionResults, {
  id: optionalIdSchema,
})

export const aiExtractionResultsSelectSchema = createSelectSchema(aiExtractionResults, {
  id: () => uuidV7Schema,
})

export const aiExtractionResultsUpdateSchema = createUpdateSchema(aiExtractionResults, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createAiExtractionResultRequestSchema = aiExtractionResultsInsertSchema.omit(serverControlled)
export const updateAiExtractionResultRequestSchema = aiExtractionResultsUpdateSchema.omit(serverControlled)
export const aiExtractionResultResponseSchema = aiExtractionResultsSelectSchema

export type AiExtractionResult = z.infer<typeof aiExtractionResultsSelectSchema>
export type AiExtractionResultInsert = z.infer<typeof aiExtractionResultsInsertSchema>
export type AiExtractionResultUpdate = z.infer<typeof aiExtractionResultsUpdateSchema>
export type CreateAiExtractionResultRequest = z.infer<typeof createAiExtractionResultRequestSchema>
export type UpdateAiExtractionResultRequest = z.infer<typeof updateAiExtractionResultRequestSchema>
export type AiExtractionResultResponse = z.infer<typeof aiExtractionResultResponseSchema>