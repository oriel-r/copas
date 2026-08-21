import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { systemNotifications } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const systemNotificationsInsertSchema = createInsertSchema(systemNotifications, {
  id: optionalIdSchema,
})

export const systemNotificationsSelectSchema = createSelectSchema(systemNotifications, {
  id: () => uuidV7Schema,
})

export const systemNotificationsUpdateSchema = createUpdateSchema(systemNotifications, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createSystemNotificationRequestSchema = systemNotificationsInsertSchema.omit(serverControlled)
export const updateSystemNotificationRequestSchema = systemNotificationsUpdateSchema.omit(serverControlled)
export const systemNotificationResponseSchema = systemNotificationsSelectSchema

export type SystemNotification = z.infer<typeof systemNotificationsSelectSchema>
export type SystemNotificationInsert = z.infer<typeof systemNotificationsInsertSchema>
export type SystemNotificationUpdate = z.infer<typeof systemNotificationsUpdateSchema>
export type CreateSystemNotificationRequest = z.infer<typeof createSystemNotificationRequestSchema>
export type UpdateSystemNotificationRequest = z.infer<typeof updateSystemNotificationRequestSchema>
export type SystemNotificationResponse = z.infer<typeof systemNotificationResponseSchema>