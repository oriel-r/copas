import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { channelEndpoints } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const channelEndpointsInsertSchema = createInsertSchema(channelEndpoints, {
  id: optionalIdSchema,
})

export const channelEndpointsSelectSchema = createSelectSchema(channelEndpoints, {
  id: () => uuidV7Schema,
})

export const channelEndpointsUpdateSchema = createUpdateSchema(channelEndpoints, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createChannelEndpointRequestSchema = channelEndpointsInsertSchema.omit(serverControlled)
export const updateChannelEndpointRequestSchema = channelEndpointsUpdateSchema.omit(serverControlled)
export const channelEndpointResponseSchema = channelEndpointsSelectSchema

export type ChannelEndpoint = z.infer<typeof channelEndpointsSelectSchema>
export type ChannelEndpointInsert = z.infer<typeof channelEndpointsInsertSchema>
export type ChannelEndpointUpdate = z.infer<typeof channelEndpointsUpdateSchema>
export type CreateChannelEndpointRequest = z.infer<typeof createChannelEndpointRequestSchema>
export type UpdateChannelEndpointRequest = z.infer<typeof updateChannelEndpointRequestSchema>
export type ChannelEndpointResponse = z.infer<typeof channelEndpointResponseSchema>