import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { organizationNotificationPreferences } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const organizationNotificationPreferencesInsertSchema = createInsertSchema(organizationNotificationPreferences, {
  organizationId: optionalIdSchema,
  categoryId: optionalIdSchema,
})

export const organizationNotificationPreferencesSelectSchema = createSelectSchema(organizationNotificationPreferences, {
  organizationId: () => uuidV7Schema,
  categoryId: () => uuidV7Schema,
})

export const organizationNotificationPreferencesUpdateSchema = createUpdateSchema(organizationNotificationPreferences, {
  organizationId: () => uuidV7Schema,
  categoryId: () => uuidV7Schema,
})

const serverControlled = {
  createdAt: true,
  updatedAt: true,
} as const

export const createOrganizationNotificationPreferenceRequestSchema = organizationNotificationPreferencesInsertSchema.omit(serverControlled)
export const updateOrganizationNotificationPreferenceRequestSchema = organizationNotificationPreferencesUpdateSchema.omit(serverControlled)
export const organizationNotificationPreferenceResponseSchema = organizationNotificationPreferencesSelectSchema

export type OrganizationNotificationPreference = z.infer<typeof organizationNotificationPreferencesSelectSchema>
export type OrganizationNotificationPreferenceInsert = z.infer<typeof organizationNotificationPreferencesInsertSchema>
export type OrganizationNotificationPreferenceUpdate = z.infer<typeof organizationNotificationPreferencesUpdateSchema>
export type CreateOrganizationNotificationPreferenceRequest = z.infer<typeof createOrganizationNotificationPreferenceRequestSchema>
export type UpdateOrganizationNotificationPreferenceRequest = z.infer<typeof updateOrganizationNotificationPreferenceRequestSchema>
export type OrganizationNotificationPreferenceResponse = z.infer<typeof organizationNotificationPreferenceResponseSchema>