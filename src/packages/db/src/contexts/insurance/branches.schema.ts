import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { entity } from '../../shared'

export const branches = sqliteTable(
  'branches',
  {
    ...entity,
    code: text('code').notNull(),
    name: text('name').notNull(),
  },
  (table) => [uniqueIndex('branches_code_uq').on(table.code)],
)
