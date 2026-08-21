import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { entity } from '../../shared'

export const companies = sqliteTable(
  'companies',
  {
    ...entity,
    code: text('code').notNull(),
    name: text('name').notNull(),
  },
  (table) => [uniqueIndex('companies_code_uq').on(table.code)],
)
