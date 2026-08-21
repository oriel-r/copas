import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { entity } from '../../shared'

export const communicationCategories = sqliteTable(
  'communication_categories',
  {
    ...entity,
    code: text('code'),
    name: text('name').notNull(),
    isMandatory: integer('isMandatory', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    uniqueIndex('communication_categories_code_uq').on(table.code),
  ],
)
