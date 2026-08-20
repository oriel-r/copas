import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { entity, enumCheck, fk } from '../../shared'
import { reminderEventSource } from '../../enums'
import { organization } from '@copas/auth'
import { messageTemplates } from '../communications'

export const reminderRules = sqliteTable(
  'reminder_rules',
  {
    ...entity,
    organizationId: fk('organizationId', true).references(
      () => organization.id,
      { onDelete: 'cascade' },
    ),
    eventSource: text('eventSource').notNull(),
    offsetDays: integer('offsetDays').notNull(),
    templateId: fk('templateId').references(() => messageTemplates.id, {
      onDelete: 'set null',
    }),
    isEnabled: integer('isEnabled', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    index('reminder_rules_organization_id_idx').on(table.organizationId),
    index('reminder_rules_template_id_idx').on(table.templateId),
    enumCheck(
      'reminder_rules_event_source_check',
      sql`${table.eventSource}`,
      reminderEventSource,
    ),
  ],
)
