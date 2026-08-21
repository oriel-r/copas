import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { notificationCampaigns } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const notificationCampaignsInsertSchema = createInsertSchema(notificationCampaigns, {
  id: optionalIdSchema,
})

export const notificationCampaignsSelectSchema = createSelectSchema(notificationCampaigns, {
  id: () => uuidV7Schema,
})

export const notificationCampaignsUpdateSchema = createUpdateSchema(notificationCampaigns, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createNotificationCampaignRequestSchema = notificationCampaignsInsertSchema.omit(serverControlled)
export const updateNotificationCampaignRequestSchema = notificationCampaignsUpdateSchema.omit(serverControlled)
export const notificationCampaignResponseSchema = notificationCampaignsSelectSchema

export type NotificationCampaign = z.infer<typeof notificationCampaignsSelectSchema>
export type NotificationCampaignInsert = z.infer<typeof notificationCampaignsInsertSchema>
export type NotificationCampaignUpdate = z.infer<typeof notificationCampaignsUpdateSchema>
export type CreateNotificationCampaignRequest = z.infer<typeof createNotificationCampaignRequestSchema>
export type UpdateNotificationCampaignRequest = z.infer<typeof updateNotificationCampaignRequestSchema>
export type NotificationCampaignResponse = z.infer<typeof notificationCampaignResponseSchema>