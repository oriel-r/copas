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

export const insuredsFilterSchema = z.object({
  companyId: z.string().optional(),
  branchId: z.string().optional(),
  policyStatus: z.enum(['all', 'active', 'expired', 'cancelled']).optional(),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
})

export type InsuredsFilter = z.infer<typeof insuredsFilterSchema>

export const insuredPolicySummarySchema = z.object({
  id: z.string(),
  policyNumber: z.string(),
  companyId: z.string(),
  companyName: z.string(),
  branchId: z.string(),
  branchName: z.string(),
  assetDescription: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(['active', 'expired', 'cancelled']),
})

export type InsuredPolicySummary = z.infer<typeof insuredPolicySummarySchema>

export const insuredDetailedItemSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  companies: z.array(z.string()),
  activePoliciesCount: z.number(),
  cuit: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  policies: z.array(insuredPolicySummarySchema),
})

export type InsuredDetailedItem = z.infer<typeof insuredDetailedItemSchema>

export const insuredsDetailedResponseSchema = z.object({
  items: z.array(insuredDetailedItemSchema),
  total: z.number(),
})

export type InsuredsDetailedResponse = z.infer<typeof insuredsDetailedResponseSchema>

export const insuredFilterOptionsSchema = z.object({
  companies: z.array(z.object({ id: z.string(), name: z.string() })),
  branches: z.array(z.object({ id: z.string(), name: z.string() })),
})

export type InsuredFilterOptions = z.infer<typeof insuredFilterOptionsSchema>

export const insuredDetailResponseSchema = insuredResponseSchema.extend({
  companies: z.array(z.string()),
  activePoliciesCount: z.number(),
  totalPoliciesCount: z.number(),
  latestPolicy: insuredPolicySummarySchema.nullable(),
})

export type InsuredDetailResponse = z.infer<typeof insuredDetailResponseSchema>