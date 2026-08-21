import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { enumCheck, fk, entity } from '../../shared'
import { orgChannelEndpointStatus } from '../../enums'
import { channelEndpoints } from './channel-endpoints.schema'
import { organizationChannels } from './organization-channels.schema'

export const organizationChannelEndpoints = sqliteTable(
  'organization_channel_endpoints',
  {
    ...entity,
    organizationChannelId: fk('organizationChannelId', true).references(
      () => organizationChannels.id,
      { onDelete: 'cascade' },
    ),
    endpointId: fk('endpointId', true).references(
      () => channelEndpoints.id,
      { onDelete: 'cascade' },
    ),
    label: text('label'),
    isPrimary: integer('isPrimary', { mode: 'boolean' }).notNull().default(false),
    status: text('status').notNull().default('active'),
    assignedAt: integer('assignedAt', { mode: 'timestamp_ms' }),
  },
  (table) => [
    uniqueIndex('organization_channel_endpoints_org_channel_endpoint_uq').on(
      table.organizationChannelId,
      table.endpointId,
    ),
    uniqueIndex('organization_channel_endpoints_primary_uq')
      .on(table.organizationChannelId)
      .where(sql`${table.isPrimary} = 1`),
    uniqueIndex('organization_channel_endpoints_endpoint_active_uq')
      .on(table.endpointId)
      .where(sql`${table.status} = 'active'`),
    index('organization_channel_endpoints_endpoint_id_idx').on(table.endpointId),
    index('organization_channel_endpoints_org_channel_id_idx').on(
      table.organizationChannelId,
    ),
    enumCheck(
      'organization_channel_endpoints_status_check',
      sql`${table.status}`,
      orgChannelEndpointStatus,
    ),
  ],
)
