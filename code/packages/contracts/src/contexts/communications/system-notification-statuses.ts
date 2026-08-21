import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { systemNotificationStatuses } from '@copas/db'

import { optionalIdSchema, uuidV7Schema } from '../../shared'

export const systemNotificationStatusesInsertSchema = createInsertSchema(systemNotificationStatuses, {
  id: optionalIdSchema,
})

export const systemNotificationStatusesSelectSchema = createSelectSchema(systemNotificationStatuses, {
  id: () => uuidV7Schema,
})

export const systemNotificationStatusesUpdateSchema = createUpdateSchema(systemNotificationStatuses, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
} as const

export const createSystemNotificationStatusRequestSchema = systemNotificationStatusesInsertSchema.omit(serverControlled)
export const updateSystemNotificationStatusRequestSchema = systemNotificationStatusesUpdateSchema.omit(serverControlled)
export const systemNotificationStatusResponseSchema = systemNotificationStatusesSelectSchema

export type SystemNotificationStatus = z.infer<typeof systemNotificationStatusesSelectSchema>
export type SystemNotificationStatusInsert = z.infer<typeof systemNotificationStatusesInsertSchema>
export type SystemNotificationStatusUpdate = z.infer<typeof systemNotificationStatusesUpdateSchema>
export type CreateSystemNotificationStatusRequest = z.infer<typeof createSystemNotificationStatusRequestSchema>
export type UpdateSystemNotificationStatusRequest = z.infer<typeof updateSystemNotificationStatusRequestSchema>
export type SystemNotificationStatusResponse = z.infer<typeof systemNotificationStatusResponseSchema>