import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { organizationChannelEndpoints } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const organizationChannelEndpointsInsertSchema = createInsertSchema(organizationChannelEndpoints, {
  id: optionalIdSchema,
})

export const organizationChannelEndpointsSelectSchema = createSelectSchema(organizationChannelEndpoints, {
  id: () => uuidV7Schema,
})

export const organizationChannelEndpointsUpdateSchema = createUpdateSchema(organizationChannelEndpoints, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createOrganizationChannelEndpointRequestSchema = organizationChannelEndpointsInsertSchema.omit(serverControlled)
export const updateOrganizationChannelEndpointRequestSchema = organizationChannelEndpointsUpdateSchema.omit(serverControlled)
export const organizationChannelEndpointResponseSchema = organizationChannelEndpointsSelectSchema

export type OrganizationChannelEndpoint = z.infer<typeof organizationChannelEndpointsSelectSchema>
export type OrganizationChannelEndpointInsert = z.infer<typeof organizationChannelEndpointsInsertSchema>
export type OrganizationChannelEndpointUpdate = z.infer<typeof organizationChannelEndpointsUpdateSchema>
export type CreateOrganizationChannelEndpointRequest = z.infer<typeof createOrganizationChannelEndpointRequestSchema>
export type UpdateOrganizationChannelEndpointRequest = z.infer<typeof updateOrganizationChannelEndpointRequestSchema>
export type OrganizationChannelEndpointResponse = z.infer<typeof organizationChannelEndpointResponseSchema>