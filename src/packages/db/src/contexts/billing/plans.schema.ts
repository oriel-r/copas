import { sql } from 'drizzle-orm'
import { check, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { currency, enumCheck, entity, json, money } from '../../shared'
import { billingInterval } from '../../enums'

export const plans = sqliteTable(
  'plans',
  {
    ...entity,
    code: text('code').notNull(),
    name: text('name').notNull(),
    price: money('price'),
    currency: currency(),
    interval: text('interval').notNull().default('month'),
    limits: json<Record<string, unknown>>('limits'),
  },
  (table) => [
    uniqueIndex('plans_code_uq').on(table.code),
    enumCheck('plans_interval_check', sql`${table.interval}`, billingInterval),
    check('plans_limits_json', sql`json_valid(${table.limits})`),
  ],
)
