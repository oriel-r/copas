import { sql } from 'drizzle-orm'
import { check, index, sqliteTable } from 'drizzle-orm/sqlite-core'

import { entity, fk, json } from '../../shared'
import { policies } from './policies.schema'

export const policyCoverages = sqliteTable(
  'policy_coverages',
  {
    ...entity,
    policyId: fk('policyId', true).references(() => policies.id, {
      onDelete: 'cascade',
    }),
    data: json<Record<string, unknown>>('data'),
  },
  (table) => [
    index('policy_coverages_policy_id_idx').on(table.policyId),
    check('policy_coverages_data_json', sql`json_valid(${table.data})`),
  ],
)
