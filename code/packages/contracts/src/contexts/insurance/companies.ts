import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { companies } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const companiesInsertSchema = createInsertSchema(companies, {
  id: optionalIdSchema,
})

export const companiesSelectSchema = createSelectSchema(companies, {
  id: () => uuidV7Schema,
})

export const companiesUpdateSchema = createUpdateSchema(companies, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createCompanyRequestSchema = companiesInsertSchema.omit(serverControlled)
export const updateCompanyRequestSchema = companiesUpdateSchema.omit(serverControlled)
export const companyResponseSchema = companiesSelectSchema

export type Company = z.infer<typeof companiesSelectSchema>
export type CompanyInsert = z.infer<typeof companiesInsertSchema>
export type CompanyUpdate = z.infer<typeof companiesUpdateSchema>
export type CreateCompanyRequest = z.infer<typeof createCompanyRequestSchema>
export type UpdateCompanyRequest = z.infer<typeof updateCompanyRequestSchema>
export type CompanyResponse = z.infer<typeof companyResponseSchema>