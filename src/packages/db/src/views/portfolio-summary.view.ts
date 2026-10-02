import { sql } from 'drizzle-orm';
import { sqliteView, text, integer } from 'drizzle-orm/sqlite-core';

export const vPortfolioSummary = sqliteView('v_portfolio_summary', {
  organizationId: text('organization_id').notNull(),
  activePoliciesCount: integer('active_policies_count').notNull(),
  totalInsuredsCount: integer('total_insureds_count').notNull(),
  paidInstallmentsThisMonthCount: integer('paid_installments_this_month_count').notNull(),
  totalInstallmentsThisMonthCount: integer('total_installments_this_month_count').notNull(),
}).as(sql`
  SELECT 
    o.id AS organization_id,
    (SELECT COUNT(*) FROM policies p WHERE p.organizationId = o.id AND p.status = 'active' AND p.deleted_at IS NULL) AS active_policies_count,
    (SELECT COUNT(*) FROM insureds i WHERE i.organizationId = o.id AND i.deleted_at IS NULL) AS total_insureds_count,
    (SELECT COUNT(*) FROM policy_installments pi WHERE pi.organizationId = o.id AND pi.status = 'paid' AND substr(pi.dueDate, 1, 7) = strftime('%Y-%m', 'now', 'localtime') AND pi.deleted_at IS NULL) AS paid_installments_this_month_count,
    (SELECT COUNT(*) FROM policy_installments pi WHERE pi.organizationId = o.id AND substr(pi.dueDate, 1, 7) = strftime('%Y-%m', 'now', 'localtime') AND pi.deleted_at IS NULL) AS total_installments_this_month_count
  FROM organization o
`);
