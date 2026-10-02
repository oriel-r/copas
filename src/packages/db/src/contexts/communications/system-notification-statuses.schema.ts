import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { enumCheck, fk, json, eventLogTable } from '../../shared'
import { notificationStatus } from '../../enums'
import { systemNotifications } from './system-notifications.schema'

export const systemNotificationStatuses = sqliteTable(
  'system_notification_statuses',
  {
    ...eventLogTable,
    systemNotificationId: fk('systemNotificationId', true).references(
      () => systemNotifications.id,
      { onDelete: 'cascade' },
    ),
    status: text('status').notNull(),
    occurredAt: integer('occurredAt', { mode: 'timestamp_ms' }).notNull(),
    details: json<Record<string, unknown>>('details'),
  },
  (table) => [
    index('system_notification_statuses_system_notification_id_idx').on(
      table.systemNotificationId,
    ),
    enumCheck(
      'system_notification_statuses_status_check',
      sql`${table.status}`,
      notificationStatus,
    ),
    check(
      'system_notification_statuses_details_json',
      sql`json_valid(${table.details})`,
    ),
  ],
)
