import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { installmentStatus, policyInstallments } from '@copas/db'

import {
  currencySchema,
  dateCivilSchema,
  moneySchema,
  nullableDateSchema,
  optionalCurrencySchema,
  optionalIdSchema,
  optionalMoneySchema,
  requiredIdSchema,
  uuidV7Schema,
} from '../../shared'

export const policyInstallmentsInsertSchema = createInsertSchema(policyInstallments, {
  id: optionalIdSchema,
  organizationId: requiredIdSchema,
  policyId: requiredIdSchema,
  uploadedBy: requiredIdSchema,
  installmentNumber: z.number().int().min(1),
  dueDate: nullableDateSchema,
  totalAmount: optionalMoneySchema,
  currency: optionalCurrencySchema,
  status: z.enum(installmentStatus).optional(),
})

export const policyInstallmentsSelectSchema = createSelectSchema(policyInstallments, {
  id: () => uuidV7Schema,
  organizationId: () => uuidV7Schema,
  policyId: () => uuidV7Schema,
  uploadedBy: () => uuidV7Schema,
  installmentNumber: () => z.number().int().min(1),
  dueDate: () => dateCivilSchema,
  totalAmount: () => moneySchema,
  currency: () => currencySchema,
  status: () => z.enum(installmentStatus),
})

export const policyInstallmentsUpdateSchema = createUpdateSchema(
  policyInstallments,
  {
    id: () => uuidV7Schema,
    organizationId: () => uuidV7Schema,
    policyId: () => uuidV7Schema,
    uploadedBy: () => uuidV7Schema,
    installmentNumber: () => z.number().int().min(1),
    dueDate: () => dateCivilSchema,
    totalAmount: () => moneySchema,
    currency: () => currencySchema,
    status: () => z.enum(installmentStatus),
  },
)

const serverControlled = {
  id: true,
  organizationId: true,
  uploadedBy: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createPolicyInstallmentRequestSchema = policyInstallmentsInsertSchema.omit(
  serverControlled,
)
export const updatePolicyInstallmentRequestSchema =
  policyInstallmentsUpdateSchema.omit(serverControlled)
export const policyInstallmentResponseSchema = policyInstallmentsSelectSchema

export const installmentsFilterSchema = z.object({
  dueDate: dateCivilSchema.optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'all']).default('pending'),
  companyId: uuidV7Schema.optional(),
  insuredId: uuidV7Schema.optional(),
  policyId: uuidV7Schema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const installmentDetailedItemSchema = z.object({
  installmentId: uuidV7Schema,
  policyId: uuidV7Schema,
  insuredId: z.string().nullable().optional(),
  policyNumber: z.string().nullable(),
  installmentNumber: z.number().int(),
  insuredName: z.string(),
  companyName: z.string(),
  assetDescription: z.string(),
  totalAmount: moneySchema.nullable(),
  currency: currencySchema.nullable(),
  dueDate: dateCivilSchema.nullable(),
  status: z.enum(installmentStatus),
})

export const installmentsDetailedResponseSchema = z.object({
  appliedFilters: z.object({
    dueDate: z.string().nullable(),
    status: z.string(),
    companyId: z.string().nullable(),
    insuredId: z.string().nullable(),
  }),
  total: z.number().int().min(0),
  items: z.array(installmentDetailedItemSchema),
})

export const updateInstallmentStatusRequestSchema = z.object({
  status: z.enum(installmentStatus),
})

export type InstallmentsFilter = z.infer<typeof installmentsFilterSchema>
export type InstallmentDetailedItem = z.infer<typeof installmentDetailedItemSchema>
export type InstallmentsDetailedResponse = z.infer<typeof installmentsDetailedResponseSchema>
export type UpdateInstallmentStatusRequest = z.infer<typeof updateInstallmentStatusRequestSchema>
export type PolicyInstallment = z.infer<typeof policyInstallmentsSelectSchema>
export type PolicyInstallmentInsert = z.infer<typeof policyInstallmentsInsertSchema>
export type PolicyInstallmentUpdate = z.infer<typeof policyInstallmentsUpdateSchema>
export type CreatePolicyInstallmentRequest = z.infer<
  typeof createPolicyInstallmentRequestSchema
>
export type UpdatePolicyInstallmentRequest = z.infer<
  typeof updatePolicyInstallmentRequestSchema
>
export type PolicyInstallmentResponse = z.infer<typeof policyInstallmentResponseSchema>