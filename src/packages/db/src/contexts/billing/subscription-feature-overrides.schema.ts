import { integer, primaryKey, sqliteTable } from 'drizzle-orm/sqlite-core'

import { fk, timestamps } from '../../shared'
import { features } from './features.schema'
import { subscriptions } from './subscriptions.schema'

export const subscriptionFeatureOverrides = sqliteTable(
  'subscription_feature_overrides',
  {
    subscriptionId: fk('subscriptionId', true).references(
      () => subscriptions.id,
      { onDelete: 'cascade' },
    ),
    featureId: fk('featureId', true).references(() => features.id, {
      onDelete: 'cascade',
    }),
    overrideLimit: integer('overrideLimit'),
    isEnabled: integer('isEnabled', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.subscriptionId, table.featureId] }),
  ],
)
