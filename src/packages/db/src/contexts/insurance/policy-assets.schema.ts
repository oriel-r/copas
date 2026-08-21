import { primaryKey, sqliteTable } from 'drizzle-orm/sqlite-core'

import { fk, timestamps } from '../../shared'
import { assets } from './assets.schema'
import { policies } from './policies.schema'

export const policyAssets = sqliteTable(
  'policy_assets',
  {
    policyId: fk('policyId', true).references(() => policies.id, {
      onDelete: 'cascade',
    }),
    assetId: fk('assetId', true).references(() => assets.id, {
      onDelete: 'cascade',
    }),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.policyId, table.assetId] })],
)
