import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { currency, enumCheck, entity, fk, json, money } from '../../shared'
import { billingInterval } from '../../enums'
import { plans } from './plans.schema'

export const planVersions = sqliteTable(
  'plan_versions',
  {
    ...entity,
    planId: fk('planId', true).references(() => plans.id, {
      onDelete: 'cascade',
    }),
    version: integer('version').notNull(),
    name: text('name').notNull(),
    price: money('price'),
    currency: currency(),
    interval: text('interval').notNull().default('month'),
    limits: json<Record<string, unknown>>('limits'),
  },
  (table) => [
    uniqueIndex('plan_versions_plan_version_uq').on(table.planId, table.version),
    index('plan_versions_plan_id_idx').on(table.planId),
    enumCheck(
      'plan_versions_interval_check',
      sql`${table.interval}`,
      billingInterval,
    ),
    check('plan_versions_limits_json', sql`json_valid(${table.limits})`),
  ],
)
