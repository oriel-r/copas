import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { fk, timestamps } from '../../shared'
import { organization } from '@copas/auth'
import { insureds } from '../insurance'
import { communicationCategories } from './communication-categories.schema'

export const communicationConsents = sqliteTable(
  'communication_consents',
  {
    organizationId: fk('organizationId', true).references(
      () => organization.id,
      { onDelete: 'cascade' },
    ),
    insuredId: fk('insuredId', true).references(() => insureds.id, {
      onDelete: 'cascade',
    }),
    categoryId: fk('categoryId', true).references(
      () => communicationCategories.id,
      { onDelete: 'cascade' },
    ),
    isOptedOut: integer('isOptedOut', { mode: 'boolean' }).notNull().default(false),
    optOutAt: integer('optOutAt', { mode: 'timestamp_ms' }),
    optOutReason: text('optOutReason'),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      columns: [table.organizationId, table.insuredId, table.categoryId],
    }),
  ],
)
