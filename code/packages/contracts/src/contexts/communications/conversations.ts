import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { conversations } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const conversationsInsertSchema = createInsertSchema(conversations, {
  id: optionalIdSchema,
})

export const conversationsSelectSchema = createSelectSchema(conversations, {
  id: () => uuidV7Schema,
})

export const conversationsUpdateSchema = createUpdateSchema(conversations, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createConversationRequestSchema = conversationsInsertSchema.omit(serverControlled)
export const updateConversationRequestSchema = conversationsUpdateSchema.omit(serverControlled)
export const conversationResponseSchema = conversationsSelectSchema

export type Conversation = z.infer<typeof conversationsSelectSchema>
export type ConversationInsert = z.infer<typeof conversationsInsertSchema>
export type ConversationUpdate = z.infer<typeof conversationsUpdateSchema>
export type CreateConversationRequest = z.infer<typeof createConversationRequestSchema>
export type UpdateConversationRequest = z.infer<typeof updateConversationRequestSchema>
export type ConversationResponse = z.infer<typeof conversationResponseSchema>