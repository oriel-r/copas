import { sql } from 'drizzle-orm';
import { sqliteView, text, integer } from 'drizzle-orm/sqlite-core';

export const vPortfolioCompanies = sqliteView('v_portfolio_companies', {
  organizationId: text('organization_id').notNull(),
  companyId: text('company_id').notNull(),
  companyName: text('company_name').notNull(),
  companyCode: text('company_code').notNull(),
  activePoliciesCount: integer('active_policies_count').notNull(),
}).as(sql`
  SELECT 
    p.organizationId AS organization_id,
    p.companyId AS company_id,
    c.name AS company_name,
    c.code AS company_code,
    COUNT(*) AS active_policies_count
  FROM policies p
  JOIN companies c ON c.id = p.companyId
  WHERE p.status = 'active' AND p.deleted_at IS NULL AND c.deleted_at IS NULL
  GROUP BY p.organizationId, p.companyId, c.name, c.code
`);
