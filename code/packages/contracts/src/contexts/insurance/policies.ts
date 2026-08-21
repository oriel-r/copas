import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { billingFrequency, policies, policyStatus } from '@copas/db'

import {
  currencySchema,
  dateCivilSchema,
  moneySchema,
  nullableDateSchema,
  nullableIdSchema,
  optionalCurrencySchema,
  optionalIdSchema,
  optionalMoneySchema,
  requiredIdSchema,
  uuidV7Schema,
} from '../../shared'

export const policiesInsertSchema = createInsertSchema(policies, {
  id: optionalIdSchema,
  organizationId: requiredIdSchema,
  companyId: requiredIdSchema,
  insuredId: requiredIdSchema,
  paymentMethodId: nullableIdSchema,
  uploadedBy: requiredIdSchema,
  producedBy: nullableIdSchema,
  premiumTotal: optionalMoneySchema,
  currency: optionalCurrencySchema,
  startDate: nullableDateSchema,
  endDate: nullableDateSchema,
  effectiveEndDate: nullableDateSchema,
  status: z.enum(policyStatus).optional(),
  billingFrequency: z.enum(billingFrequency).optional(),
})

export const policiesSelectSchema = createSelectSchema(policies, {
  id: () => uuidV7Schema,
  organizationId: () => uuidV7Schema,
  companyId: () => uuidV7Schema,
  insuredId: () => uuidV7Schema,
  paymentMethodId: () => uuidV7Schema,
  uploadedBy: () => uuidV7Schema,
  producedBy: () => uuidV7Schema,
  premiumTotal: () => moneySchema,
  currency: () => currencySchema,
  startDate: () => dateCivilSchema,
  endDate: () => dateCivilSchema,
  effectiveEndDate: () => dateCivilSchema,
  status: () => z.enum(policyStatus),
  billingFrequency: () => z.enum(billingFrequency),
})

export const policiesUpdateSchema = createUpdateSchema(policies, {
  id: () => uuidV7Schema,
  organizationId: () => uuidV7Schema,
  companyId: () => uuidV7Schema,
  insuredId: () => uuidV7Schema,
  paymentMethodId: () => uuidV7Schema,
  uploadedBy: () => uuidV7Schema,
  producedBy: () => uuidV7Schema,
  premiumTotal: () => moneySchema,
  currency: () => currencySchema,
  startDate: () => dateCivilSchema,
  endDate: () => dateCivilSchema,
  effectiveEndDate: () => dateCivilSchema,
  status: () => z.enum(policyStatus),
  billingFrequency: () => z.enum(billingFrequency),
})

const serverControlled = {
  id: true,
  organizationId: true,
  uploadedBy: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createPolicyRequestSchema = policiesInsertSchema
  .omit(serverControlled)
  .superRefine((value, ctx) => {
    if (
      value.startDate &&
      value.endDate &&
      value.startDate > value.endDate
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'endDate no puede ser anterior a startDate',
      })
    }
  })

export const updatePolicyRequestSchema = policiesUpdateSchema.omit(serverControlled)

export const policyResponseSchema = policiesSelectSchema

export type Policy = z.infer<typeof policiesSelectSchema>
export type PolicyInsert = z.infer<typeof policiesInsertSchema>
export type PolicyUpdate = z.infer<typeof policiesUpdateSchema>
export type CreatePolicyRequest = z.infer<typeof createPolicyRequestSchema>
export type UpdatePolicyRequest = z.infer<typeof updatePolicyRequestSchema>
export type PolicyResponse = z.infer<typeof policyResponseSchema>