import { sql } from 'drizzle-orm'
import { check, index, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { entity, fk, json, uploadedBy } from '../../shared'
import { user } from '@copas/auth'
import { assetTypes } from './asset-types.schema'
import { insureds } from './insureds.schema'

export const assets = sqliteTable(
  'assets',
  {
    ...entity,
    insuredId: fk('insuredId', true).references(() => insureds.id, {
      onDelete: 'cascade',
    }),
    assetTypeId: fk('assetTypeId', true).references(() => assetTypes.id, {
      onDelete: 'restrict',
    }),
    uploadedBy: uploadedBy().references(() => user.id, {
      onDelete: 'restrict',
    }),
    externalReference: text('externalReference'),
    properties: json<Record<string, unknown>>('properties'),
  },
  (table) => [
    index('assets_insured_id_idx').on(table.insuredId),
    index('assets_asset_type_id_idx').on(table.assetTypeId),
    index('assets_uploaded_by_idx').on(table.uploadedBy),
    check('assets_properties_json', sql`json_valid(${table.properties})`),
  ],
)
