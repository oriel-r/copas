import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { messageStatuses } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const messageStatusesInsertSchema = createInsertSchema(messageStatuses, {
  id: optionalIdSchema,
})

export const messageStatusesSelectSchema = createSelectSchema(messageStatuses, {
  id: () => uuidV7Schema,
})

export const messageStatusesUpdateSchema = createUpdateSchema(messageStatuses, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
} as const

export const createMessageStatusRequestSchema = messageStatusesInsertSchema.omit(serverControlled)
export const updateMessageStatusRequestSchema = messageStatusesUpdateSchema.omit(serverControlled)
export const messageStatusResponseSchema = messageStatusesSelectSchema

export type MessageStatus = z.infer<typeof messageStatusesSelectSchema>
export type MessageStatusInsert = z.infer<typeof messageStatusesInsertSchema>
export type MessageStatusUpdate = z.infer<typeof messageStatusesUpdateSchema>
export type CreateMessageStatusRequest = z.infer<typeof createMessageStatusRequestSchema>
export type UpdateMessageStatusRequest = z.infer<typeof updateMessageStatusRequestSchema>
export type MessageStatusResponse = z.infer<typeof messageStatusResponseSchema>