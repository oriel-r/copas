import { and, eq, isNull, sql } from 'drizzle-orm'
import { sqliteView } from 'drizzle-orm/sqlite-core'

import { companies, insureds, policies } from '../contexts/insurance'

export const vExpiringPolicies = sqliteView('v_expiring_policies').as((qb) =>
  qb
    .select({
      policyId: policies.id,
      organizationId: policies.organizationId,
      policyNumber: policies.policyNumber,
      policyStatus: policies.status,
      startDate: policies.startDate,
      endDate: policies.endDate,
      effectiveEndDate: policies.effectiveEndDate,
      expirationDate: sql<string>`COALESCE(${policies.effectiveEndDate}, ${policies.endDate})`.as('expiration_date'),
      plateNumber: sql<string | null>`(SELECT COALESCE(json_extract(a.properties, '$.PATENTE'), json_extract(a.properties, '$.patente'), json_extract(a.properties, '$.dominio'), json_extract(a.properties, '$.plate')) FROM policy_assets pa INNER JOIN assets a ON a.id = pa.assetId AND a.deleted_at IS NULL WHERE pa.policyId = ${policies.id} AND pa.deleted_at IS NULL LIMIT 1)`.as('plateNumber'),
      companyId: policies.companyId,
      companyName: companies.name,
      companyCode: companies.code,
      insuredId: insureds.id,
      insuredFullName: insureds.fullName,
      insuredPhone: insureds.phone,
      insuredEmail: insureds.email,
      insuredCuit: insureds.cuit,
    })
    .from(policies)
    .innerJoin(insureds, eq(insureds.id, policies.insuredId))
    .innerJoin(companies, eq(companies.id, policies.companyId))
    .where(
      and(
        isNull(policies.deletedAt),
        isNull(insureds.deletedAt),
        isNull(companies.deletedAt),
      ),
    ),
)
