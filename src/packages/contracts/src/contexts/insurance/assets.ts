import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { assets } from '@copas/db'

import {
  jsonObjectSchema,
  nullableJsonSchema,
  optionalIdSchema,
  requiredIdSchema,
  uuidV7Schema,
} from '../../shared'

export const assetsInsertSchema = createInsertSchema(assets, {
  id: optionalIdSchema,
  insuredId: requiredIdSchema,
  assetTypeId: requiredIdSchema,
  uploadedBy: requiredIdSchema,
  properties: nullableJsonSchema,
})

export const assetsSelectSchema = createSelectSchema(assets, {
  id: () => uuidV7Schema,
  insuredId: () => uuidV7Schema,
  assetTypeId: () => uuidV7Schema,
  uploadedBy: () => uuidV7Schema,
  properties: () => jsonObjectSchema,
})

export const assetsUpdateSchema = createUpdateSchema(assets, {
  id: () => uuidV7Schema,
  insuredId: () => uuidV7Schema,
  assetTypeId: () => uuidV7Schema,
  uploadedBy: () => uuidV7Schema,
  properties: () => jsonObjectSchema,
})

const serverControlled = {
  id: true,
  uploadedBy: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createAssetRequestSchema = assetsInsertSchema.omit(serverControlled)
export const updateAssetRequestSchema = assetsUpdateSchema.omit(serverControlled)
export const assetResponseSchema = assetsSelectSchema

export type Asset = z.infer<typeof assetsSelectSchema>
export type AssetInsert = z.infer<typeof assetsInsertSchema>
export type AssetUpdate = z.infer<typeof assetsUpdateSchema>
export type CreateAssetRequest = z.infer<typeof createAssetRequestSchema>
export type UpdateAssetRequest = z.infer<typeof updateAssetRequestSchema>
export type AssetResponse = z.infer<typeof assetResponseSchema>