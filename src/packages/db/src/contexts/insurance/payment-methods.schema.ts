import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { entity } from '../../shared'

export const paymentMethods = sqliteTable(
  'payment_methods',
  {
    ...entity,
    code: text('code').notNull(),
    name: text('name').notNull(),
  },
  (table) => [uniqueIndex('payment_methods_code_uq').on(table.code)],
)
