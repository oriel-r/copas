import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { entity } from '../../shared'

export const features = sqliteTable(
  'features',
  {
    ...entity,
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
  },
  (table) => [uniqueIndex('features_code_uq').on(table.code)],
)
