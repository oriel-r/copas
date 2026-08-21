import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { insureds } from '@copas/db'

import {
  cuitSchema,
  dateCivilSchema,
  nullableDateSchema,
  nullableEmailSchema,
  nullablePhoneSchema,
  optionalIdSchema,
  requiredIdSchema,
  uuidV7Schema,
} from '../../shared'

export const insuredsInsertSchema = createInsertSchema(insureds, {
  id: optionalIdSchema,
  organizationId: requiredIdSchema,
  uploadedBy: requiredIdSchema,
  cuit: cuitSchema,
  phone: nullablePhoneSchema,
  email: nullableEmailSchema,
  birthDate: nullableDateSchema,
})

export const insuredsSelectSchema = createSelectSchema(insureds, {
  id: () => uuidV7Schema,
  organizationId: () => uuidV7Schema,
  uploadedBy: () => uuidV7Schema,
  cuit: () => cuitSchema,
  phone: () => z.string().regex(/^\+?[\d\s()-]{6,20}$/),
  email: () => z.email(),
  birthDate: () => dateCivilSchema,
})

export const insuredsUpdateSchema = createUpdateSchema(insureds, {
  id: () => uuidV7Schema,
  organizationId: () => uuidV7Schema,
  uploadedBy: () => uuidV7Schema,
  cuit: () => cuitSchema,
  phone: () => z.string().regex(/^\+?[\d\s()-]{6,20}$/),
  email: () => z.email(),
  birthDate: () => dateCivilSchema,
})

const serverControlled = {
  id: true,
  organizationId: true,
  uploadedBy: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createInsuredRequestSchema = insuredsInsertSchema.omit(serverControlled)
export const updateInsuredRequestSchema = insuredsUpdateSchema.omit(serverControlled)
export const insuredResponseSchema = insuredsSelectSchema

export type Insured = z.infer<typeof insuredsSelectSchema>
export type InsuredInsert = z.infer<typeof insuredsInsertSchema>
export type InsuredUpdate = z.infer<typeof insuredsUpdateSchema>
export type CreateInsuredRequest = z.infer<typeof createInsuredRequestSchema>
export type UpdateInsuredRequest = z.infer<typeof updateInsuredRequestSchema>
export type InsuredResponse = z.infer<typeof insuredResponseSchema>