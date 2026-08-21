import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { entity, fk, json } from '../../shared'
import { channels } from './channels.schema'
import { communicationCategories } from './communication-categories.schema'

export const messageTemplates = sqliteTable(
  'message_templates',
  {
    ...entity,
    channelId: fk('channelId', true).references(
      () => channels.id,
      { onDelete: 'cascade' },
    ),
    categoryId: fk('categoryId', true).references(
      () => communicationCategories.id,
      { onDelete: 'restrict' },
    ),
    code: text('code'),
    name: text('name').notNull(),
    subject: text('subject'),
    body: text('body').notNull(),
    variables: json<Record<string, unknown>>('variables'),
    isSystemBase: integer('isSystemBase', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    uniqueIndex('message_templates_code_uq').on(table.code),
    uniqueIndex('message_templates_id_channel_uq').on(table.id, table.channelId),
    index('message_templates_channel_id_idx').on(table.channelId),
    index('message_templates_category_id_idx').on(table.categoryId),
    check('message_templates_variables_json', sql`json_valid(${table.variables})`),
  ],
)
