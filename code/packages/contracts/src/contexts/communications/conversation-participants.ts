import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { conversationParticipants } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const conversationParticipantsInsertSchema = createInsertSchema(conversationParticipants, {
  id: optionalIdSchema,
})

export const conversationParticipantsSelectSchema = createSelectSchema(conversationParticipants, {
  id: () => uuidV7Schema,
})

export const conversationParticipantsUpdateSchema = createUpdateSchema(conversationParticipants, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createConversationParticipantRequestSchema = conversationParticipantsInsertSchema.omit(serverControlled)
export const updateConversationParticipantRequestSchema = conversationParticipantsUpdateSchema.omit(serverControlled)
export const conversationParticipantResponseSchema = conversationParticipantsSelectSchema

export type ConversationParticipant = z.infer<typeof conversationParticipantsSelectSchema>
export type ConversationParticipantInsert = z.infer<typeof conversationParticipantsInsertSchema>
export type ConversationParticipantUpdate = z.infer<typeof conversationParticipantsUpdateSchema>
export type CreateConversationParticipantRequest = z.infer<typeof createConversationParticipantRequestSchema>
export type UpdateConversationParticipantRequest = z.infer<typeof updateConversationParticipantRequestSchema>
export type ConversationParticipantResponse = z.infer<typeof conversationParticipantResponseSchema>