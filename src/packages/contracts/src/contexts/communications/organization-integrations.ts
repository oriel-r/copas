import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { organizationIntegrations } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const organizationIntegrationsInsertSchema = createInsertSchema(organizationIntegrations, {
  id: optionalIdSchema,
})

export const organizationIntegrationsSelectSchema = createSelectSchema(organizationIntegrations, {
  id: () => uuidV7Schema,
})

export const organizationIntegrationsUpdateSchema = createUpdateSchema(organizationIntegrations, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createOrganizationIntegrationRequestSchema = organizationIntegrationsInsertSchema.omit(serverControlled)
export const updateOrganizationIntegrationRequestSchema = organizationIntegrationsUpdateSchema.omit(serverControlled)
export const organizationIntegrationResponseSchema = organizationIntegrationsSelectSchema

export type OrganizationIntegration = z.infer<typeof organizationIntegrationsSelectSchema>
export type OrganizationIntegrationInsert = z.infer<typeof organizationIntegrationsInsertSchema>
export type OrganizationIntegrationUpdate = z.infer<typeof organizationIntegrationsUpdateSchema>
export type CreateOrganizationIntegrationRequest = z.infer<typeof createOrganizationIntegrationRequestSchema>
export type UpdateOrganizationIntegrationRequest = z.infer<typeof updateOrganizationIntegrationRequestSchema>
export type OrganizationIntegrationResponse = z.infer<typeof organizationIntegrationResponseSchema>