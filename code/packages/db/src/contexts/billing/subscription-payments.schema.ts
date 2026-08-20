import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { currency, entity, enumCheck, fk, money } from '../../shared'
import { subscriptionPaymentStatus } from '../../enums'
import { organization } from '@copas/auth'
import { subscriptions } from './subscriptions.schema'

export const subscriptionPayments = sqliteTable(
  'subscription_payments',
  {
    ...entity,
    organizationId: fk('organizationId', true).references(
      () => organization.id,
      { onDelete: 'cascade' },
    ),
    subscriptionId: fk('subscriptionId', true).references(
      () => subscriptions.id,
      { onDelete: 'cascade' },
    ),
    amount: money('amount'),
    currency: currency(),
    status: text('status').notNull().default('pending'),
    gatewayTransactionId: text('gatewayTransactionId'),
    paymentDate: integer('paymentDate', { mode: 'timestamp_ms' }),
  },
  (table) => [
    index('subscription_payments_organization_id_idx').on(table.organizationId),
    index('subscription_payments_subscription_id_idx').on(table.subscriptionId),
    enumCheck(
      'subscription_payments_status_check',
      sql`${table.status}`,
      subscriptionPaymentStatus,
    ),
  ],
)
