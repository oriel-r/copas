import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { assetTypes } from '@copas/db'

import {
  jsonObjectSchema,
  nullableIdSchema,
  nullableJsonSchema,
  optionalIdSchema,
  uuidV7Schema,
} from '../../shared'

export const assetTypesInsertSchema = createInsertSchema(assetTypes, {
  id: optionalIdSchema,
  branchId: nullableIdSchema,
  propertyDefinition: nullableJsonSchema,
})

export const assetTypesSelectSchema = createSelectSchema(assetTypes, {
  id: () => uuidV7Schema,
  branchId: () => uuidV7Schema,
  propertyDefinition: () => jsonObjectSchema,
})

export const assetTypesUpdateSchema = createUpdateSchema(assetTypes, {
  id: () => uuidV7Schema,
  branchId: () => uuidV7Schema,
  propertyDefinition: () => jsonObjectSchema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createAssetTypeRequestSchema = assetTypesInsertSchema.omit(
  serverControlled,
)
export const updateAssetTypeRequestSchema = assetTypesUpdateSchema.omit(
  serverControlled,
)
export const assetTypeResponseSchema = assetTypesSelectSchema

export type AssetType = z.infer<typeof assetTypesSelectSchema>
export type AssetTypeInsert = z.infer<typeof assetTypesInsertSchema>
export type AssetTypeUpdate = z.infer<typeof assetTypesUpdateSchema>
export type CreateAssetTypeRequest = z.infer<typeof createAssetTypeRequestSchema>
export type UpdateAssetTypeRequest = z.infer<typeof updateAssetTypeRequestSchema>
export type AssetTypeResponse = z.infer<typeof assetTypeResponseSchema>