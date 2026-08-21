import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { messageTemplates } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const messageTemplatesInsertSchema = createInsertSchema(messageTemplates, {
  id: optionalIdSchema,
})

export const messageTemplatesSelectSchema = createSelectSchema(messageTemplates, {
  id: () => uuidV7Schema,
})

export const messageTemplatesUpdateSchema = createUpdateSchema(messageTemplates, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createMessageTemplateRequestSchema = messageTemplatesInsertSchema.omit(serverControlled)
export const updateMessageTemplateRequestSchema = messageTemplatesUpdateSchema.omit(serverControlled)
export const messageTemplateResponseSchema = messageTemplatesSelectSchema

export type MessageTemplate = z.infer<typeof messageTemplatesSelectSchema>
export type MessageTemplateInsert = z.infer<typeof messageTemplatesInsertSchema>
export type MessageTemplateUpdate = z.infer<typeof messageTemplatesUpdateSchema>
export type CreateMessageTemplateRequest = z.infer<typeof createMessageTemplateRequestSchema>
export type UpdateMessageTemplateRequest = z.infer<typeof updateMessageTemplateRequestSchema>
export type MessageTemplateResponse = z.infer<typeof messageTemplateResponseSchema>