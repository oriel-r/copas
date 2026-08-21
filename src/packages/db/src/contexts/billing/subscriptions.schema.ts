import { sql } from 'drizzle-orm'
import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { currency, dateCivil, entity, enumCheck, fk, money } from '../../shared'
import { subscriptionStatus } from '../../enums'
import { organization } from '@copas/auth'
import { planVersions } from './plan-versions.schema'

export const subscriptions = sqliteTable(
  'subscriptions',
  {
    ...entity,
    organizationId: fk('organizationId', true).references(
      () => organization.id,
      { onDelete: 'cascade' },
    ),
    planVersionId: fk('planVersionId', true).references(
      () => planVersions.id,
      { onDelete: 'restrict' },
    ),
    status: text('status').notNull().default('active'),
    priceAmount: money('priceAmount'),
    currency: currency(),
    periodStart: dateCivil('periodStart'),
    periodEnd: dateCivil('periodEnd'),
  },
  (table) => [
    uniqueIndex('subscriptions_active_org_uq')
      .on(table.organizationId)
      .where(sql`${table.status} = 'active'`),
    index('subscriptions_organization_id_idx').on(table.organizationId),
    index('subscriptions_plan_version_id_idx').on(table.planVersionId),
    enumCheck('subscriptions_status_check', sql`${table.status}`, subscriptionStatus),
  ],
)
