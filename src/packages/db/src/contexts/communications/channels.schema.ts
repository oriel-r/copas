import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { entity } from '../../shared'

export const channels = sqliteTable(
  'channels',
  {
    ...entity,
    code: text('code'),
    name: text('name').notNull(),
    description: text('description'),
    isSystem: integer('isSystem', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    uniqueIndex('channels_code_uq').on(table.code),
  ],
)
