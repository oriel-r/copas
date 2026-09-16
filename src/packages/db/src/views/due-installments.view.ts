import { and, eq, isNull, sql } from 'drizzle-orm'
import { sqliteView } from 'drizzle-orm/sqlite-core'

import { companies, insureds, policies, policyInstallments } from '../contexts/insurance'

export const vDueInstallments = sqliteView('v_due_installments').as((qb) =>
  qb
    .select({
      installmentId: policyInstallments.id,
      organizationId: policyInstallments.organizationId,
      policyId: policyInstallments.policyId,
      installmentNumber: policyInstallments.installmentNumber,
      dueDate: policyInstallments.dueDate,
      totalAmount: policyInstallments.totalAmount,
      currency: policyInstallments.currency,
      installmentStatus: policyInstallments.status,
      receiptUrl: policyInstallments.receiptUrl,
      plateNumber: sql<string | null>`(SELECT COALESCE(json_extract(a.properties, '$.PATENTE'), json_extract(a.properties, '$.patente'), json_extract(a.properties, '$.dominio'), json_extract(a.properties, '$.plate')) FROM policy_assets pa INNER JOIN assets a ON a.id = pa.assetId AND a.deleted_at IS NULL WHERE pa.policyId = ${policies.id} AND pa.deleted_at IS NULL LIMIT 1)`.as('plateNumber'),
      policyNumber: policies.policyNumber,
      policyStatus: policies.status,
      policyStartDate: policies.startDate,
      policyEndDate: policies.endDate,
      policyEffectiveEndDate: policies.effectiveEndDate,
      companyId: policies.companyId,
      companyName: companies.name,
      companyCode: companies.code,
      insuredId: insureds.id,
      insuredFullName: insureds.fullName,
      insuredPhone: insureds.phone,
      insuredEmail: insureds.email,
      insuredCuit: insureds.cuit,
    })
    .from(policyInstallments)
    .innerJoin(policies, eq(policies.id, policyInstallments.policyId))
    .innerJoin(insureds, eq(insureds.id, policies.insuredId))
    .innerJoin(companies, eq(companies.id, policies.companyId))
    .where(
      and(
        isNull(policyInstallments.deletedAt),
        isNull(policies.deletedAt),
        isNull(insureds.deletedAt),
        isNull(companies.deletedAt),
      ),
    ),
)
