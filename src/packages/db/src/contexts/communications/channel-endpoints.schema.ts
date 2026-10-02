import { sql } from 'drizzle-orm'
import { check, index, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { enumCheck, fk, entity } from '../../shared'
import { endpointStatus, ownerKind, provider } from '../../enums'
import { organization } from '@copas/auth'
import { channels } from './channels.schema'

export const channelEndpoints = sqliteTable(
  'channel_endpoints',
  {
    ...entity,
    channelId: fk('channelId', true).references(
      () => channels.id,
      { onDelete: 'cascade' },
    ),
    number: text('number'),
    provider: text('provider').notNull(),
    ownerKind: text('ownerKind').notNull().default('platform'),
    ownerOrganizationId: fk('ownerOrganizationId').references(
      () => organization.id,
    ),
    status: text('status').notNull().default('active'),
  },
  (table) => [
    index('channel_endpoints_channel_id_idx').on(table.channelId),
    index('channel_endpoints_owner_organization_id_idx').on(
      table.ownerOrganizationId,
    ),
    enumCheck('channel_endpoints_provider_check', sql`${table.provider}`, provider),
    enumCheck('channel_endpoints_owner_kind_check', sql`${table.ownerKind}`, ownerKind),
    enumCheck('channel_endpoints_status_check', sql`${table.status}`, endpointStatus),
    check(
      'channel_endpoints_owner_organization_coherence',
      sql`CASE ${table.ownerKind}
        WHEN 'organization' THEN ${table.ownerOrganizationId} IS NOT NULL
        WHEN 'platform' THEN ${table.ownerOrganizationId} IS NULL
      END`,
    ),
  ],
)
