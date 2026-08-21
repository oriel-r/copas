import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { organizationChannels } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const organizationChannelsInsertSchema = createInsertSchema(organizationChannels, {
  id: optionalIdSchema,
})

export const organizationChannelsSelectSchema = createSelectSchema(organizationChannels, {
  id: () => uuidV7Schema,
})

export const organizationChannelsUpdateSchema = createUpdateSchema(organizationChannels, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createOrganizationChannelRequestSchema = organizationChannelsInsertSchema.omit(serverControlled)
export const updateOrganizationChannelRequestSchema = organizationChannelsUpdateSchema.omit(serverControlled)
export const organizationChannelResponseSchema = organizationChannelsSelectSchema

export type OrganizationChannel = z.infer<typeof organizationChannelsSelectSchema>
export type OrganizationChannelInsert = z.infer<typeof organizationChannelsInsertSchema>
export type OrganizationChannelUpdate = z.infer<typeof organizationChannelsUpdateSchema>
export type CreateOrganizationChannelRequest = z.infer<typeof createOrganizationChannelRequestSchema>
export type UpdateOrganizationChannelRequest = z.infer<typeof updateOrganizationChannelRequestSchema>
export type OrganizationChannelResponse = z.infer<typeof organizationChannelResponseSchema>