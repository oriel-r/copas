import { sql } from 'drizzle-orm'
import { integer } from 'drizzle-orm/sqlite-core'

import { id } from './id.table'

/**
 * Trazabilidad para tablas de log de eventos y vínculos instantáneos
 * (`*_statuses`, `conversation_entities`): son inmutables, solo `created_at`.
 * @see DER §Convenciones: "Logs de eventos ... llevan solo created_at"
 */
export const eventLog = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
}

export const eventLogTable = {
  ...id,
  ...eventLog,
}
