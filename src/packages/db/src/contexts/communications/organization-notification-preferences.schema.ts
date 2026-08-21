import { integer, primaryKey, sqliteTable } from 'drizzle-orm/sqlite-core'

import { fk, timestamps } from '../../shared'
import { organization } from '@copas/auth'
import { communicationCategories } from './communication-categories.schema'

export const organizationNotificationPreferences = sqliteTable(
  'organization_notification_preferences',
  {
    organizationId: fk('organizationId', true).references(
      () => organization.id,
      { onDelete: 'cascade' },
    ),
    categoryId: fk('categoryId', true).references(
      () => communicationCategories.id,
      { onDelete: 'cascade' },
    ),
    isEnabled: integer('isEnabled', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.categoryId] }),
  ],
)
