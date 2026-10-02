import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { channels } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const channelsInsertSchema = createInsertSchema(channels, {
  id: optionalIdSchema,
})

export const channelsSelectSchema = createSelectSchema(channels, {
  id: () => uuidV7Schema,
})

export const channelsUpdateSchema = createUpdateSchema(channels, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createChannelRequestSchema = channelsInsertSchema.omit(serverControlled)
export const updateChannelRequestSchema = channelsUpdateSchema.omit(serverControlled)
export const channelResponseSchema = channelsSelectSchema

export type Channel = z.infer<typeof channelsSelectSchema>
export type ChannelInsert = z.infer<typeof channelsInsertSchema>
export type ChannelUpdate = z.infer<typeof channelsUpdateSchema>
export type CreateChannelRequest = z.infer<typeof createChannelRequestSchema>
export type UpdateChannelRequest = z.infer<typeof updateChannelRequestSchema>
export type ChannelResponse = z.infer<typeof channelResponseSchema>