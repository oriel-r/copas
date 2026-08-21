import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { policyAssets } from '@copas/db'

import { requiredIdSchema, uuidV7Schema } from '../../shared'

export const policyAssetsInsertSchema = createInsertSchema(policyAssets, {
  policyId: requiredIdSchema,
  assetId: requiredIdSchema,
})

export const policyAssetsSelectSchema = createSelectSchema(policyAssets, {
  policyId: () => uuidV7Schema,
  assetId: () => uuidV7Schema,
})

export const policyAssetsUpdateSchema = createUpdateSchema(policyAssets, {
  policyId: () => uuidV7Schema,
  assetId: () => uuidV7Schema,
})

const serverControlled = {
  createdAt: true,
  updatedAt: true,
} as const

export const createPolicyAssetRequestSchema = policyAssetsInsertSchema.omit(
  serverControlled,
)
export const updatePolicyAssetRequestSchema = policyAssetsUpdateSchema.omit(
  serverControlled,
)
export const policyAssetResponseSchema = policyAssetsSelectSchema

export type PolicyAsset = z.infer<typeof policyAssetsSelectSchema>
export type PolicyAssetInsert = z.infer<typeof policyAssetsInsertSchema>
export type PolicyAssetUpdate = z.infer<typeof policyAssetsUpdateSchema>
export type CreatePolicyAssetRequest = z.infer<typeof createPolicyAssetRequestSchema>
export type UpdatePolicyAssetRequest = z.infer<typeof updatePolicyAssetRequestSchema>
export type PolicyAssetResponse = z.infer<typeof policyAssetResponseSchema>