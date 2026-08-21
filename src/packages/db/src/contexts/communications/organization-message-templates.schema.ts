import { sql } from 'drizzle-orm'
import { check, integer, primaryKey, sqliteTable } from 'drizzle-orm/sqlite-core'

import { fk, json, timestamps } from '../../shared'
import { organization } from '@copas/auth'
import { messageTemplates } from './message-templates.schema'

export const organizationMessageTemplates = sqliteTable(
  'organization_message_templates',
  {
    organizationId: fk('organizationId', true).references(
      () => organization.id,
      { onDelete: 'cascade' },
    ),
    templateId: fk('templateId', true).references(
      () => messageTemplates.id,
      { onDelete: 'cascade' },
    ),
    isEnabled: integer('isEnabled', { mode: 'boolean' }).notNull().default(false),
    customOverrides: json<Record<string, unknown>>('customOverrides'),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.templateId] }),
    check(
      'organization_message_templates_custom_overrides_json',
      sql`json_valid(${table.customOverrides})`,
    ),
  ],
)
