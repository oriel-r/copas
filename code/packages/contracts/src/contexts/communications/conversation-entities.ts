import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { conversationEntities } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const conversationEntitiesInsertSchema = createInsertSchema(conversationEntities, {
  id: optionalIdSchema,
})

export const conversationEntitiesSelectSchema = createSelectSchema(conversationEntities, {
  id: () => uuidV7Schema,
})

export const conversationEntitiesUpdateSchema = createUpdateSchema(conversationEntities, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
} as const

export const createConversationEntityRequestSchema = conversationEntitiesInsertSchema.omit(serverControlled)
export const updateConversationEntityRequestSchema = conversationEntitiesUpdateSchema.omit(serverControlled)
export const conversationEntityResponseSchema = conversationEntitiesSelectSchema

export type ConversationEntity = z.infer<typeof conversationEntitiesSelectSchema>
export type ConversationEntityInsert = z.infer<typeof conversationEntitiesInsertSchema>
export type ConversationEntityUpdate = z.infer<typeof conversationEntitiesUpdateSchema>
export type CreateConversationEntityRequest = z.infer<typeof createConversationEntityRequestSchema>
export type UpdateConversationEntityRequest = z.infer<typeof updateConversationEntityRequestSchema>
export type ConversationEntityResponse = z.infer<typeof conversationEntityResponseSchema>