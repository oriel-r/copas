import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { messages } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const messagesInsertSchema = createInsertSchema(messages, {
  id: optionalIdSchema,
})

export const messagesSelectSchema = createSelectSchema(messages, {
  id: () => uuidV7Schema,
})

export const messagesUpdateSchema = createUpdateSchema(messages, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createMessageRequestSchema = messagesInsertSchema.omit(serverControlled)
export const updateMessageRequestSchema = messagesUpdateSchema.omit(serverControlled)
export const messageResponseSchema = messagesSelectSchema

export type Message = z.infer<typeof messagesSelectSchema>
export type MessageInsert = z.infer<typeof messagesInsertSchema>
export type MessageUpdate = z.infer<typeof messagesUpdateSchema>
export type CreateMessageRequest = z.infer<typeof createMessageRequestSchema>
export type UpdateMessageRequest = z.infer<typeof updateMessageRequestSchema>
export type MessageResponse = z.infer<typeof messageResponseSchema>