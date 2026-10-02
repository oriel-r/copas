import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { communicationConsents } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const communicationConsentsInsertSchema = createInsertSchema(communicationConsents, {
  organizationId: optionalIdSchema,
  insuredId: optionalIdSchema,
  categoryId: optionalIdSchema,
})

export const communicationConsentsSelectSchema = createSelectSchema(communicationConsents, {
  organizationId: () => uuidV7Schema,
  insuredId: () => uuidV7Schema,
  categoryId: () => uuidV7Schema,
})

export const communicationConsentsUpdateSchema = createUpdateSchema(communicationConsents, {
  organizationId: () => uuidV7Schema,
  insuredId: () => uuidV7Schema,
  categoryId: () => uuidV7Schema,
})

const serverControlled = {
  createdAt: true,
  updatedAt: true,
} as const

export const createCommunicationConsentRequestSchema = communicationConsentsInsertSchema.omit(serverControlled)
export const updateCommunicationConsentRequestSchema = communicationConsentsUpdateSchema.omit(serverControlled)
export const communicationConsentResponseSchema = communicationConsentsSelectSchema

export type CommunicationConsent = z.infer<typeof communicationConsentsSelectSchema>
export type CommunicationConsentInsert = z.infer<typeof communicationConsentsInsertSchema>
export type CommunicationConsentUpdate = z.infer<typeof communicationConsentsUpdateSchema>
export type CreateCommunicationConsentRequest = z.infer<typeof createCommunicationConsentRequestSchema>
export type UpdateCommunicationConsentRequest = z.infer<typeof updateCommunicationConsentRequestSchema>
export type CommunicationConsentResponse = z.infer<typeof communicationConsentResponseSchema>