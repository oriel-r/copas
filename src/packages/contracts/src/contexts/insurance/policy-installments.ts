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