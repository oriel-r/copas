import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { organizationMessageTemplates } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const organizationMessageTemplatesInsertSchema = createInsertSchema(organizationMessageTemplates, {
  organizationId: optionalIdSchema,
  templateId: optionalIdSchema,
})

export const organizationMessageTemplatesSelectSchema = createSelectSchema(organizationMessageTemplates, {
  organizationId: () => uuidV7Schema,
  templateId: () => uuidV7Schema,
})

export const organizationMessageTemplatesUpdateSchema = createUpdateSchema(organizationMessageTemplates, {
  organizationId: () => uuidV7Schema,
  templateId: () => uuidV7Schema,
})

const serverControlled = {
  createdAt: true,
  updatedAt: true,
} as const

export const createOrganizationMessageTemplateRequestSchema = organizationMessageTemplatesInsertSchema.omit(serverControlled)
export const updateOrganizationMessageTemplateRequestSchema = organizationMessageTemplatesUpdateSchema.omit(serverControlled)
export const organizationMessageTemplateResponseSchema = organizationMessageTemplatesSelectSchema

export type OrganizationMessageTemplate = z.infer<typeof organizationMessageTemplatesSelectSchema>
export type OrganizationMessageTemplateInsert = z.infer<typeof organizationMessageTemplatesInsertSchema>
export type OrganizationMessageTemplateUpdate = z.infer<typeof organizationMessageTemplatesUpdateSchema>
export type CreateOrganizationMessageTemplateRequest = z.infer<typeof createOrganizationMessageTemplateRequestSchema>
export type UpdateOrganizationMessageTemplateRequest = z.infer<typeof updateOrganizationMessageTemplateRequestSchema>
export type OrganizationMessageTemplateResponse = z.infer<typeof organizationMessageTemplateResponseSchema>