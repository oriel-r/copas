import { and, eq, isNull, ne, sql } from 'drizzle-orm'
import { sqliteView, unionAll } from 'drizzle-orm/sqlite-core'

import { reminderRules } from '../contexts/reminders'
import {
  companies,
  insureds,
  policies,
  policyInstallments,
} from '../contexts/insurance'
import {
  communicationCategories,
  communicationConsents,
  messageTemplates,
} from '../contexts/communications'

export const vDueReminders = sqliteView('v_due_reminders').as((qb) => {
  const installmentsQuery = qb
    .select({
      ruleId: sql<string>`${reminderRules.id}`.as('ruleId'),
      organizationId: sql<string>`${reminderRules.organizationId}`.as('organizationId'),
      eventSource: sql<string>`${reminderRules.eventSource}`.as('eventSource'),
      offsetDays: sql<number>`${reminderRules.offsetDays}`.as('offsetDays'),
      scheduledDate: sql<string>`date(${policyInstallments.dueDate}, printf('%+d days', ${reminderRules.offsetDays}))`.as('scheduledDate'),
      targetDate: sql<string>`${policyInstallments.dueDate}`.as('targetDate'),
      entityType: sql<string>`'installment'`.as('entityType'),
      entityId: sql<string>`${policyInstallments.id}`.as('entityId'),
      policyId: sql<string>`${policies.id}`.as('policyId'),
      policyNumber: sql<string | null>`${policies.policyNumber}`.as('policyNumber'),
      policyStatus: sql<string>`${policies.status}`.as('policyStatus'),
      policyStartDate: sql<string | null>`${policies.startDate}`.as('policyStartDate'),
      policyEndDate: sql<string | null>`${policies.endDate}`.as('policyEndDate'),
      policyEffectiveEndDate: sql<string | null>`${policies.effectiveEndDate}`.as('policyEffectiveEndDate'),
      companyId: sql<string>`${companies.id}`.as('companyId'),
      companyName: sql<string>`${companies.name}`.as('companyName'),
      companyCode: sql<string | null>`${companies.code}`.as('companyCode'),
      insuredId: sql<string>`${insureds.id}`.as('insuredId'),
      insuredFullName: sql<string>`${insureds.fullName}`.as('insuredFullName'),
      insuredPhone: sql<string | null>`${insureds.phone}`.as('insuredPhone'),
      insuredEmail: sql<string | null>`${insureds.email}`.as('insuredEmail'),
      insuredCuit: sql<string | null>`${insureds.cuit}`.as('insuredCuit'),
      plateNumber: sql<string | null>`(SELECT COALESCE(json_extract(a.properties, '$.PATENTE'), json_extract(a.properties, '$.patente'), json_extract(a.properties, '$.dominio'), json_extract(a.properties, '$.plate')) FROM policy_assets pa INNER JOIN assets a ON a.id = pa.assetId AND a.deleted_at IS NULL WHERE pa.policyId = ${policies.id} AND pa.deleted_at IS NULL LIMIT 1)`.as('plateNumber'),
      installmentId: sql<string | null>`${policyInstallments.id}`.as('installmentId'),
      installmentNumber: sql<number | null>`${policyInstallments.installmentNumber}`.as('installmentNumber'),
      totalAmount: sql<number | null>`${policyInstallments.totalAmount}`.as('totalAmount'),
      currency: sql<string | null>`${policyInstallments.currency}`.as('currency'),
      dueDate: sql<string | null>`${policyInstallments.dueDate}`.as('dueDate'),
      expirationDate: sql<string | null>`COALESCE(${policies.effectiveEndDate}, ${policies.endDate})`.as('expirationDate'),
      receiptUrl: sql<string | null>`${policyInstallments.receiptUrl}`.as('receiptUrl'),
      templateId: sql<string | null>`${reminderRules.templateId}`.as('templateId'),
      templateName: sql<string>`COALESCE(${messageTemplates.name}, 'reminder_default')`.as('templateName'),
      templateCode: sql<string | null>`${messageTemplates.code}`.as('templateCode'),
      templateBody: sql<string | null>`${messageTemplates.body}`.as('templateBody'),
      isOptedOut: sql<boolean>`COALESCE(${communicationConsents.isOptedOut}, 0)`.as('isOptedOut'),
      canDeliver: sql<boolean>`CASE WHEN COALESCE(${communicationConsents.isOptedOut}, 0) = 0 AND ${insureds.phone} IS NOT NULL AND trim(${insureds.phone}) != '' THEN 1 ELSE 0 END`.as('canDeliver'),
      skipReason: sql<string | null>`CASE WHEN COALESCE(${communicationConsents.isOptedOut}, 0) = 1 THEN 'opt_out' WHEN ${insureds.phone} IS NULL OR trim(${insureds.phone}) = '' THEN 'missing_phone' ELSE NULL END`.as('skipReason'),
    })
    .from(reminderRules)
    .innerJoin(
      policyInstallments,
      and(
        eq(policyInstallments.organizationId, reminderRules.organizationId),
        ne(policyInstallments.status, 'paid'),
        isNull(policyInstallments.deletedAt),
      ),
    )
    .innerJoin(
      policies,
      and(
        eq(policies.id, policyInstallments.policyId),
        isNull(policies.deletedAt),
      ),
    )
    .innerJoin(
      insureds,
      and(
        eq(insureds.id, policies.insuredId),
        isNull(insureds.deletedAt),
      ),
    )
    .innerJoin(
      companies,
      and(
        eq(companies.id, policies.companyId),
        isNull(companies.deletedAt),
      ),
    )
    .leftJoin(
      messageTemplates,
      and(
        eq(messageTemplates.id, reminderRules.templateId),
        isNull(messageTemplates.deletedAt),
      ),
    )
    .leftJoin(
      communicationCategories,
      and(
        eq(communicationCategories.code, 'billing'),
        isNull(communicationCategories.deletedAt),
      ),
    )
    .leftJoin(
      communicationConsents,
      and(
        eq(communicationConsents.organizationId, reminderRules.organizationId),
        eq(communicationConsents.insuredId, insureds.id),
        eq(communicationConsents.categoryId, communicationCategories.id),
        isNull(communicationConsents.deletedAt),
      ),
    )
    .where(
      and(
        eq(reminderRules.eventSource, 'installment_due'),
        eq(reminderRules.isEnabled, true),
        isNull(reminderRules.deletedAt),
      ),
    )

  const policiesQuery = qb
    .select({
      ruleId: sql<string>`${reminderRules.id}`.as('ruleId'),
      organizationId: sql<string>`${reminderRules.organizationId}`.as('organizationId'),
      eventSource: sql<string>`${reminderRules.eventSource}`.as('eventSource'),
      offsetDays: sql<number>`${reminderRules.offsetDays}`.as('offsetDays'),
      scheduledDate: sql<string>`date(COALESCE(${policies.effectiveEndDate}, ${policies.endDate}), printf('%+d days', ${reminderRules.offsetDays}))`.as('scheduledDate'),
      targetDate: sql<string>`COALESCE(${policies.effectiveEndDate}, ${policies.endDate})`.as('targetDate'),
      entityType: sql<string>`'policy'`.as('entityType'),
      entityId: sql<string>`${policies.id}`.as('entityId'),
      policyId: sql<string>`${policies.id}`.as('policyId'),
      policyNumber: sql<string | null>`${policies.policyNumber}`.as('policyNumber'),
      policyStatus: sql<string>`${policies.status}`.as('policyStatus'),
      policyStartDate: sql<string | null>`${policies.startDate}`.as('policyStartDate'),
      policyEndDate: sql<string | null>`${policies.endDate}`.as('policyEndDate'),
      policyEffectiveEndDate: sql<string | null>`${policies.effectiveEndDate}`.as('policyEffectiveEndDate'),
      companyId: sql<string>`${companies.id}`.as('companyId'),
      companyName: sql<string>`${companies.name}`.as('companyName'),
      companyCode: sql<string | null>`${companies.code}`.as('companyCode'),
      insuredId: sql<string>`${insureds.id}`.as('insuredId'),
      insuredFullName: sql<string>`${insureds.fullName}`.as('insuredFullName'),
      insuredPhone: sql<string | null>`${insureds.phone}`.as('insuredPhone'),
      insuredEmail: sql<string | null>`${insureds.email}`.as('insuredEmail'),
      insuredCuit: sql<string | null>`${insureds.cuit}`.as('insuredCuit'),
      plateNumber: sql<string | null>`(SELECT COALESCE(json_extract(a.properties, '$.PATENTE'), json_extract(a.properties, '$.patente'), json_extract(a.properties, '$.dominio'), json_extract(a.properties, '$.plate')) FROM policy_assets pa INNER JOIN assets a ON a.id = pa.assetId AND a.deleted_at IS NULL WHERE pa.policyId = ${policies.id} AND pa.deleted_at IS NULL LIMIT 1)`.as('plateNumber'),
      installmentId: sql<string | null>`NULL`.as('installmentId'),
      installmentNumber: sql<number | null>`NULL`.as('installmentNumber'),
      totalAmount: sql<number | null>`NULL`.as('totalAmount'),
      currency: sql<string | null>`${policies.currency}`.as('currency'),
      dueDate: sql<string | null>`NULL`.as('dueDate'),
      expirationDate: sql<string | null>`COALESCE(${policies.effectiveEndDate}, ${policies.endDate})`.as('expirationDate'),
      receiptUrl: sql<string | null>`NULL`.as('receiptUrl'),
      templateId: sql<string | null>`${reminderRules.templateId}`.as('templateId'),
      templateName: sql<string>`COALESCE(${messageTemplates.name}, 'reminder_default')`.as('templateName'),
      templateCode: sql<string | null>`${messageTemplates.code}`.as('templateCode'),
      templateBody: sql<string | null>`${messageTemplates.body}`.as('templateBody'),
      isOptedOut: sql<boolean>`COALESCE(${communicationConsents.isOptedOut}, 0)`.as('isOptedOut'),
      canDeliver: sql<boolean>`CASE WHEN COALESCE(${communicationConsents.isOptedOut}, 0) = 0 AND ${insureds.phone} IS NOT NULL AND trim(${insureds.phone}) != '' THEN 1 ELSE 0 END`.as('canDeliver'),
      skipReason: sql<string | null>`CASE WHEN COALESCE(${communicationConsents.isOptedOut}, 0) = 1 THEN 'opt_out' WHEN ${insureds.phone} IS NULL OR trim(${insureds.phone}) = '' THEN 'missing_phone' ELSE NULL END`.as('skipReason'),
    })
    .from(reminderRules)
    .innerJoin(
      policies,
      and(
        eq(policies.organizationId, reminderRules.organizationId),
        eq(policies.status, 'active'),
        isNull(policies.deletedAt),
      ),
    )
    .innerJoin(
      insureds,
      and(
        eq(insureds.id, policies.insuredId),
        isNull(insureds.deletedAt),
      ),
    )
    .innerJoin(
      companies,
      and(
        eq(companies.id, policies.companyId),
        isNull(companies.deletedAt),
      ),
    )
    .leftJoin(
      messageTemplates,
      and(
        eq(messageTemplates.id, reminderRules.templateId),
        isNull(messageTemplates.deletedAt),
      ),
    )
    .leftJoin(
      communicationCategories,
      and(
        eq(communicationCategories.code, 'renewals'),
        isNull(communicationCategories.deletedAt),
      ),
    )
    .leftJoin(
      communicationConsents,
      and(
        eq(communicationConsents.organizationId, reminderRules.organizationId),
        eq(communicationConsents.insuredId, insureds.id),
        eq(communicationConsents.categoryId, communicationCategories.id),
        isNull(communicationConsents.deletedAt),
      ),
    )
    .where(
      and(
        eq(reminderRules.eventSource, 'policy_expiration'),
        eq(reminderRules.isEnabled, true),
        isNull(reminderRules.deletedAt),
      ),
    )

  return unionAll(installmentsQuery, policiesQuery)
})
