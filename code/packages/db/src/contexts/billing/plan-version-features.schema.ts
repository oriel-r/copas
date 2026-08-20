import { integer, primaryKey, sqliteTable } from 'drizzle-orm/sqlite-core'

import { fk, timestamps } from '../../shared'
import { features } from './features.schema'
import { planVersions } from './plan-versions.schema'

export const planVersionFeatures = sqliteTable(
  'plan_version_features',
  {
    planVersionId: fk('planVersionId', true).references(
      () => planVersions.id,
      { onDelete: 'cascade' },
    ),
    featureId: fk('featureId', true).references(() => features.id, {
      onDelete: 'cascade',
    }),
    featureLimit: integer('featureLimit'),
    isEnabled: integer('isEnabled', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.planVersionId, table.featureId] }),
  ],
)
