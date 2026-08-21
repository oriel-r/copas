import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { enumCheck, fk, json, eventLogTable } from '../../shared'
import { messageStatus } from '../../enums'
import { messages } from './messages.schema'

export const messageStatuses = sqliteTable(
  'message_statuses',
  {
    ...eventLogTable,
    messageId: fk('messageId', true).references(
      () => messages.id,
      { onDelete: 'cascade' },
    ),
    status: text('status').notNull(),
    occurredAt: integer('occurredAt', { mode: 'timestamp_ms' }).notNull(),
    details: json<Record<string, unknown>>('details'),
  },
  (table) => [
    index('message_statuses_message_id_idx').on(table.messageId),
    enumCheck('message_statuses_status_check', sql`${table.status}`, messageStatus),
    check('message_statuses_details_json', sql`json_valid(${table.details})`),
  ],
)
