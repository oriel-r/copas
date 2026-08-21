import { sql } from 'drizzle-orm'
import { check, index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { entity, fk, json } from '../../shared'
import { branches } from './branches.schema'

export const assetTypes = sqliteTable(
  'asset_types',
  {
    ...entity,
    branchId: fk('branchId').references(() => branches.id, {
      onDelete: 'set null',
    }),
    code: text('code'),
    name: text('name'),
    propertyDefinition: json<Record<string, unknown>>('propertyDefinition'),
  },
  (table) => [
    uniqueIndex('asset_types_branch_code_uq').on(table.branchId, table.code),
    index('asset_types_branch_id_idx').on(table.branchId),
    check(
      'asset_types_property_definition_json',
      sql`json_valid(${table.propertyDefinition})`,
    ),
  ],
)
