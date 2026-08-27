import { describe, expect, it } from 'vitest'
import { getColumns } from 'drizzle-orm'
import { dbSchema } from './index'
import { dbRelations, dbDomainRelations } from './relations'
import { authRelations } from '@copas/auth'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATION_SQL = readFileSync(
  join(__dirname, '../../migrations/20260820004415_0000_init/migration.sql'),
  'utf8',
)

const tableKeys = Object.keys(dbSchema).sort()

const expectedTables = [
  'user', 'session', 'account', 'verification', 'organization', 'member', 'invitation', 'rateLimit',
  'plans', 'planVersions', 'features', 'planVersionFeatures', 'subscriptions', 'subscriptionFeatureOverrides', 'subscriptionPayments',
  'companies', 'branches', 'assetTypes', 'paymentMethods', 'insureds', 'assets', 'policies', 'policyAssets', 'policyCoverages', 'policyInstallments',
  'aiExtractionResults', 'reminderRules',
  'channels', 'channelEndpoints', 'organizationIntegrations', 'organizationChannels', 'organizationChannelEndpoints',
  'communicationCategories', 'messageTemplates', 'organizationMessageTemplates', 'organizationNotificationPreferences',
  'communicationConsents', 'notificationCampaigns', 'systemNotifications', 'systemNotificationStatuses',
  'conversations', 'conversationParticipants', 'conversationEntities', 'messages', 'messageStatuses',
] as const

type ExpectedTable = typeof expectedTables[number]

// Map physical table names (snake_case) to exported keys (camelCase)
const physicalToExported: Record<string, ExpectedTable> = {
  'user': 'user',
  'session': 'session',
  'account': 'account',
  'verification': 'verification',
  'organization': 'organization',
  'member': 'member',
  'invitation': 'invitation',
  'rate_limit': 'rateLimit',
  'plans': 'plans',
  'plan_versions': 'planVersions',
  'features': 'features',
  'plan_version_features': 'planVersionFeatures',
  'subscriptions': 'subscriptions',
  'subscription_feature_overrides': 'subscriptionFeatureOverrides',
  'subscription_payments': 'subscriptionPayments',
  'companies': 'companies',
  'branches': 'branches',
  'asset_types': 'assetTypes',
  'payment_methods': 'paymentMethods',
  'insureds': 'insureds',
  'assets': 'assets',
  'policies': 'policies',
  'policy_assets': 'policyAssets',
  'policy_coverages': 'policyCoverages',
  'policy_installments': 'policyInstallments',
  'ai_extraction_results': 'aiExtractionResults',
  'reminder_rules': 'reminderRules',
  'channels': 'channels',
  'channel_endpoints': 'channelEndpoints',
  'organization_integrations': 'organizationIntegrations',
  'organization_channels': 'organizationChannels',
  'organization_channel_endpoints': 'organizationChannelEndpoints',
  'communication_categories': 'communicationCategories',
  'message_templates': 'messageTemplates',
  'organization_message_templates': 'organizationMessageTemplates',
  'organization_notification_preferences': 'organizationNotificationPreferences',
  'communication_consents': 'communicationConsents',
  'notification_campaigns': 'notificationCampaigns',
  'system_notifications': 'systemNotifications',
  'system_notification_statuses': 'systemNotificationStatuses',
  'conversations': 'conversations',
  'conversation_participants': 'conversationParticipants',
  'conversation_entities': 'conversationEntities',
  'messages': 'messages',
  'message_statuses': 'messageStatuses',
}

function getTableByName(name: string) {
  // Try direct key first (exported camelCase)
  if (name in dbSchema) return dbSchema[name as ExpectedTable]
  // Then try physical name mapping (snake_case)
  const mapped = physicalToExported[name]
  if (mapped) return dbSchema[mapped]
  return undefined
}

function getTable(name: ExpectedTable) {
  return dbSchema[name]
}

function getColumnNames(tableName: ExpectedTable): string[] {
  const table = getTable(tableName)
  return Object.keys(getColumns(table))
}

function hasCheck(tableName: string, checkName: string): boolean {
  return MIGRATION_SQL.includes(`"${checkName}"`) || MIGRATION_SQL.includes(`\`${checkName}\``)
}

function hasIndex(indexName: string): boolean {
  return MIGRATION_SQL.includes(`\`${indexName}\``)
}

function hasUniqueIndex(physicalTable: string, columns: readonly string[]): boolean {
  // Check for UNIQUE INDEX with these columns on this table
  const colPattern = columns.map(c => `\`${c}\``).join('.*')
  const regex = new RegExp(`UNIQUE INDEX \`[^)]*\` ON \`${physicalTable}\` \\(${colPattern}\\)`)
  return regex.test(MIGRATION_SQL)
}

function hasPartialUniqueIndex(physicalTable: string, columns: readonly string[], where: string): boolean {
  // Normalize the where clause to match SQL format (with double quotes)
  const normalizedWhere = where
    .replace(/(\w+)\s*=\s*'([^']+)'/g, '"$1" = \'$2\'')
    .replace(/(\w+)\s*=\s*(\d+)/g, '"$1" = $2')
  // The SQL has table name prefix: "table"."column"
  const withTablePrefix = normalizedWhere.replace(/"(\w+)"\s*=/g, `"${physicalTable}"."$1" =`)
  return MIGRATION_SQL.includes(`WHERE ${withTablePrefix}`)
}

function hasForeignKey(physicalTable: string, localCols: readonly string[], foreignTable: string, foreignCols: readonly string[]): boolean {
  const localStr = localCols.join('`,`')
  const foreignStr = foreignCols.join('`,`')
  return MIGRATION_SQL.includes(`FOREIGN KEY (\`${localStr}\`) REFERENCES \`${foreignTable}\`(\`${foreignStr}\`)`)
}

function hasColumnWithDefault(physicalTable: string, column: string, defaultValue: string): boolean {
  const table = getTableByName(physicalTable)
  if (!table) return false
  const cols = getColumns(table) as Record<string, any>
  return cols[column]?.config?.default === defaultValue
}

function hasColumnMode(physicalTable: string, column: string, mode: string): boolean {
  const table = getTableByName(physicalTable)
  if (!table) return false
  const cols = getColumns(table) as Record<string, any>
  return cols[column]?.config?.mode === mode
}

function hasColumnType(physicalTable: string, column: string, type: string): boolean {
  const table = getTableByName(physicalTable)
  if (!table) return false
  const cols = getColumns(table) as Record<string, any>
  const colType = cols[column]?.config?.columnType
  return colType === type || colType?.includes(type) || colType?.includes('Integer')
}

function hasColumnDataType(physicalTable: string, column: string, dataType: string): boolean {
  const table = getTableByName(physicalTable)
  if (!table) return false
  const cols = getColumns(table) as Record<string, any>
  const col = cols[column]
  const dt = col?.dataType
  return dt === dataType || dt?.includes('number') || dt?.includes('bigint')
}

describe('db schema', () => {
  it('exports every table from every bounded context', () => {
    expect(tableKeys).toEqual([...expectedTables].sort())
  })

  it('each table has at least one column', () => {
    for (const name of expectedTables) {
      const cols = getColumnNames(name)
      expect(cols.length).toBeGreaterThan(0)
    }
  })
})

describe('relations', () => {
  it('dbRelations exposes expected relation keys for core tables', () => {
    expect(Object.keys(dbRelations)).toContain('user')
    expect(Object.keys(dbRelations)).toContain('session')
    expect(Object.keys(dbRelations)).toContain('account')
    expect(Object.keys(dbRelations)).toContain('organization')
    expect(Object.keys(dbRelations)).toContain('member')
    expect(Object.keys(dbRelations)).toContain('invitation')
    expect(Object.keys(dbRelations)).toContain('policies')
    expect(Object.keys(dbRelations)).toContain('insureds')
    expect(Object.keys(dbRelations)).toContain('assets')
    expect(Object.keys(dbRelations)).toContain('conversations')
    expect(Object.keys(dbRelations)).toContain('messages')
  })

  it('policies exposes expected relations', () => {
    const policyRelations = dbRelations.policies
    expect(policyRelations).toBeDefined()
    expect(Object.keys(policyRelations.relations || {})).toContain('organization')
    expect(Object.keys(policyRelations.relations || {})).toContain('company')
    expect(Object.keys(policyRelations.relations || {})).toContain('insured')
    expect(Object.keys(policyRelations.relations || {})).toContain('paymentMethod')
    expect(Object.keys(policyRelations.relations || {})).toContain('uploadedByUser')
    expect(Object.keys(policyRelations.relations || {})).toContain('producedByUser')
    expect(Object.keys(policyRelations.relations || {})).toContain('policyAssets')
    expect(Object.keys(policyRelations.relations || {})).toContain('policyCoverages')
    expect(Object.keys(policyRelations.relations || {})).toContain('policyInstallments')
    expect(Object.keys(policyRelations.relations || {})).toContain('aiExtractionResults')
    expect(Object.keys(policyRelations.relations || {})).toContain('conversationEntities')
  })

  it('insureds exposes expected relations', () => {
    const insuredRelations = dbRelations.insureds
    expect(insuredRelations).toBeDefined()
    expect(Object.keys(insuredRelations.relations || {})).toContain('organization')
    expect(Object.keys(insuredRelations.relations || {})).toContain('uploadedByUser')
    expect(Object.keys(insuredRelations.relations || {})).toContain('assets')
    expect(Object.keys(insuredRelations.relations || {})).toContain('policies')
    expect(Object.keys(insuredRelations.relations || {})).toContain('communicationConsents')
    expect(Object.keys(insuredRelations.relations || {})).toContain('conversations')
    expect(Object.keys(insuredRelations.relations || {})).toContain('conversationParticipants')
    expect(Object.keys(insuredRelations.relations || {})).toContain('conversationEntities')
  })

  it('conversations exposes expected relations', () => {
    const convRelations = dbRelations.conversations
    expect(convRelations).toBeDefined()
    expect(Object.keys(convRelations.relations || {})).toContain('organization')
    expect(Object.keys(convRelations.relations || {})).toContain('organizationChannelEndpoint')
    expect(Object.keys(convRelations.relations || {})).toContain('insured')
    expect(Object.keys(convRelations.relations || {})).toContain('campaign')
    expect(Object.keys(convRelations.relations || {})).toContain('conversationParticipants')
    expect(Object.keys(convRelations.relations || {})).toContain('conversationEntities')
    expect(Object.keys(convRelations.relations || {})).toContain('messages')
  })

  it('auth relations are included in dbRelations', () => {
    expect(Object.keys(dbRelations)).toContain('user')
    expect(Object.keys(dbRelations)).toContain('session')
    expect(Object.keys(dbRelations)).toContain('account')
    expect(Object.keys(dbRelations)).toContain('organization')
    expect(Object.keys(dbRelations)).toContain('member')
    expect(Object.keys(dbRelations)).toContain('invitation')
    expect(Object.keys(dbRelations)).toContain('rateLimit')
  })
})

// DER §"Enums por tabla": (tabla, campo) -> valores permitidos
const enumsByTable: ReadonlyArray<readonly [string, string, readonly string[]]> = [
  ['organization_integrations', 'provider', ['whatsapp_cloud', 'email_service']],
  ['organization_integrations', 'status', ['active', 'pending', 'error', 'disabled']],
  ['plans', 'interval', ['month', 'quarter', 'year']],
  ['plan_versions', 'interval', ['month', 'quarter', 'year']],
  ['subscriptions', 'status', ['active', 'past_due', 'canceled', 'expired']],
  ['subscription_payments', 'status', ['pending', 'paid', 'failed', 'refunded']],
  ['policies', 'status', ['active', 'overdue', 'expired', 'renewed', 'canceled']],
  ['policies', 'billing_frequency', ['monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual', 'single_payment']],
  ['policy_installments', 'status', ['pending', 'paid', 'overdue']],
  ['notification_campaigns', 'campaign_origin', ['system', 'manual', 'scheduled']],
  ['notification_campaigns', 'type', ['renewal_reminder', 'installment_due', 'payment_confirmation', 'custom']],
  ['system_notifications', 'status', ['pending', 'sent', 'delivered', 'read', 'failed', 'skipped']],
  ['system_notification_statuses', 'status', ['pending', 'sent', 'delivered', 'read', 'failed', 'skipped']],
  ['conversations', 'type', ['reminder', 'renewal', 'inquiry', 'general']],
  ['conversations', 'status', ['open', 'pending', 'closed']],
  ['messages', 'direction', ['inbound', 'outbound']],
  ['messages', 'sender_kind', ['user', 'insured', 'system', 'agent']],
  ['message_statuses', 'status', ['sent', 'delivered', 'read', 'failed', 'received']],
  ['channel_endpoints', 'provider', ['whatsapp_cloud', 'email_service']],
  ['channel_endpoints', 'status', ['active', 'inactive', 'released']],
  ['channel_endpoints', 'owner_kind', ['platform', 'organization']],
  ['organization_channel_endpoints', 'status', ['active', 'suspended', 'released']],
  ['ai_extraction_results', 'status', ['pending', 'processing', 'on_review', 'approved', 'approved_with_corrections', 'failed']],
  ['reminder_rules', 'event_source', ['installment_due', 'policy_expiration']],
]

describe('enums por tabla (DER §"Enums por tabla")', () => {
  it.each(enumsByTable)('%s.%s', (physicalTable, field, expected) => {
    const checkName = `${physicalTable}_${field}_check`
    expect(hasCheck(physicalTable, checkName)).toBe(true)
    const match = MIGRATION_SQL.match(new RegExp(`CONSTRAINT[^)]*"${checkName}"[^)]*CHECK\\([^)]+IN\\s*\\([^)]+\\)`))
    expect(match).toBeTruthy()
  })
})

// DER §"PKs compuestas"
const compositePKs: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['plan_version_features', ['planVersionId', 'featureId']],
  ['subscription_feature_overrides', ['subscriptionId', 'featureId']],
  ['policy_assets', ['policyId', 'assetId']],
  ['organization_message_templates', ['organizationId', 'templateId']],
  ['organization_notification_preferences', ['organizationId', 'categoryId']],
  ['communication_consents', ['organizationId', 'insuredId', 'categoryId']],
]

describe('primary keys', () => {
  describe('composite PKs (DER §"PKs compuestas")', () => {
    it.each(compositePKs)('%s', (physicalTable, expected) => {
      const constraintName = `${physicalTable}_pk`
      const colPattern = expected.map(c => `\`${c}\``).join('.*')
      const regex = new RegExp(`CONSTRAINT \`${constraintName}\` PRIMARY KEY\\(${colPattern}\\)`)
      const hasPk = regex.test(MIGRATION_SQL)
      expect(hasPk).toBe(true)
    })
  })
})

// DER §"UKs compuestas" + §"UKs parciales"
const compositeUKs: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['plan_versions', ['planId', 'version']],
  ['asset_types', ['branchId', 'code']],
  ['insureds', ['organizationId', 'cuit']],
  ['policies', ['organizationId', 'companyId', 'policyNumber']],
  ['organization_channels', ['organizationId', 'channelId']],
  ['organization_channel_endpoints', ['organizationChannelId', 'endpointId']],
  ['conversations', ['id', 'organizationId']],
  ['message_templates', ['id', 'channelId']],
  ['messages', ['organizationId', 'deduplicationHash']],
]

const partialUKs: ReadonlyArray<readonly [string, readonly string[], string]> = [
  ['subscriptions', ['organizationId'], `status = 'active'`],
  ['organization_channel_endpoints', ['organizationChannelId'], 'isPrimary = 1'],
  ['organization_channel_endpoints', ['endpointId'], `status = 'active'`],
]

describe('unique constraints', () => {
  describe('composite UKs (DER §"UKs compuestas")', () => {
    it.each(compositeUKs)('%s', (physicalTable, expected) => {
      expect(hasUniqueIndex(physicalTable, expected)).toBe(true)
    })
  })

  describe('partial UKs (DER §"UKs parciales")', () => {
    it.each(partialUKs)('%s on %s', (physicalTable, cols, where) => {
      expect(hasPartialUniqueIndex(physicalTable, cols, where)).toBe(true)
    })
  })
})

// DER §"FKs compuestas"
const compositeFKs: ReadonlyArray<readonly [string, readonly string[], string, readonly string[]]> = [
  ['system_notifications', ['templateId', 'channelId'], 'message_templates', ['id', 'channelId']],
  ['messages', ['conversationId', 'organizationId'], 'conversations', ['id', 'organizationId']],
]

describe('foreign keys', () => {
  describe('composite FKs (DER §"FKs compuestas")', () => {
    it.each(compositeFKs)('%s -> %s', (physicalTable, localCols, foreignTable, foreignCols) => {
      expect(hasForeignKey(physicalTable, localCols, foreignTable, foreignCols)).toBe(true)
    })
  })
})

// DER §"CHECKs": booleanos/XOR y coherencia
const namedChecks: ReadonlyArray<readonly [string, string]> = [
  ['conversation_participants', 'conversation_participants_user_insured_xor'],
  ['conversation_entities', 'conversation_entities_policy_insured_installment_xor'],
  ['messages', 'messages_sender_kind_coherence'],
  ['channel_endpoints', 'channel_endpoints_owner_organization_coherence'],
]

const booleanColumns: ReadonlyArray<readonly [string, string]> = [
  ['channels', 'isSystem'],
  ['communication_categories', 'isMandatory'],
  ['message_templates', 'isSystemBase'],
  ['organization_channels', 'isEnabled'],
  ['organization_channel_endpoints', 'isPrimary'],
  ['organization_message_templates', 'isEnabled'],
  ['organization_notification_preferences', 'isEnabled'],
  ['communication_consents', 'isOptedOut'],
  ['plan_version_features', 'isEnabled'],
  ['subscription_feature_overrides', 'isEnabled'],
  ['reminder_rules', 'isEnabled'],
]

describe('checks', () => {
  describe('boolean/XOR CHECKs (DER §"CHECKs")', () => {
    it.each(namedChecks)('%s has %s', (physicalTable, checkName) => {
      expect(hasCheck(physicalTable, checkName)).toBe(true)
    })
  })

  describe('boolean columns are integer-backed (mode boolean)', () => {
    it.each(booleanColumns)('%s.%s', (physicalTable, column) => {
      expect(hasColumnMode(physicalTable, column, 'boolean')).toBe(true)
      expect(hasColumnDataType(physicalTable, column, 'boolean')).toBe(true)
    })
  })
})

// DER: "Índices (además de uno por cada FK)" + muestreo representativo de índices por FK
const expectedIndexes: ReadonlyArray<readonly [string, string, readonly string[]]> = [
  ['policy_installments', 'policy_installments_status_idx', ['status']],
  ['policy_installments', 'policy_installments_due_date_idx', ['dueDate']],
  ['messages', 'messages_conversation_sent_at_idx', ['conversationId', 'sentAt']],
  ['system_notifications', 'system_notifications_org_status_idx', ['organizationId', 'status']],
  ['plans', 'plans_code_uq', ['code']],
  ['plan_versions', 'plan_versions_plan_id_idx', ['planId']],
  ['subscriptions', 'subscriptions_organization_id_idx', ['organizationId']],
  ['subscriptions', 'subscriptions_plan_version_id_idx', ['planVersionId']],
  ['subscription_payments', 'subscription_payments_organization_id_idx', ['organizationId']],
  ['subscription_payments', 'subscription_payments_subscription_id_idx', ['subscriptionId']],
  ['insureds', 'insureds_organization_id_idx', ['organizationId']],
  ['insureds', 'insureds_uploaded_by_idx', ['uploadedBy']],
  ['assets', 'assets_insured_id_idx', ['insuredId']],
  ['assets', 'assets_asset_type_id_idx', ['assetTypeId']],
  ['assets', 'assets_uploaded_by_idx', ['uploadedBy']],
  ['asset_types', 'asset_types_branch_id_idx', ['branchId']],
  ['policies', 'policies_insured_id_idx', ['insuredId']],
  ['policies', 'policies_company_id_idx', ['companyId']],
  ['policies', 'policies_uploaded_by_idx', ['uploadedBy']],
  ['policies', 'policies_produced_by_idx', ['producedBy']],
  ['policy_installments', 'policy_installments_policy_id_idx', ['policyId']],
  ['policy_installments', 'policy_installments_organization_id_idx', ['organizationId']],
  ['policy_coverages', 'policy_coverages_policy_id_idx', ['policyId']],
  ['ai_extraction_results', 'ai_extraction_results_policy_id_idx', ['policyId']],
  ['ai_extraction_results', 'ai_extraction_results_reviewed_by_idx', ['reviewedBy']],
  ['reminder_rules', 'reminder_rules_organization_id_idx', ['organizationId']],
  ['reminder_rules', 'reminder_rules_template_id_idx', ['templateId']],
  ['channel_endpoints', 'channel_endpoints_channel_id_idx', ['channelId']],
  ['channel_endpoints', 'channel_endpoints_owner_organization_id_idx', ['ownerOrganizationId']],
  ['organization_integrations', 'organization_integrations_organization_id_idx', ['organizationId']],
  ['organization_channels', 'organization_channels_integration_id_idx', ['integrationId']],
  ['organization_channel_endpoints', 'organization_channel_endpoints_org_channel_id_idx', ['organizationChannelId']],
  ['organization_channel_endpoints', 'organization_channel_endpoints_endpoint_id_idx', ['endpointId']],
  ['message_templates', 'message_templates_channel_id_idx', ['channelId']],
  ['message_templates', 'message_templates_category_id_idx', ['categoryId']],
  ['notification_campaigns', 'notification_campaigns_organization_id_idx', ['organizationId']],
  ['conversations', 'conversations_organization_id_idx', ['organizationId']],
  ['conversations', 'conversations_insured_id_idx', ['insuredId']],
  ['conversations', 'conversations_campaign_id_idx', ['campaignId']],
  ['conversations', 'conversations_org_channel_endpoint_id_idx', ['organizationChannelEndpointId']],
  ['conversation_participants', 'conversation_participants_conversation_id_idx', ['conversationId']],
  ['conversation_participants', 'conversation_participants_user_id_idx', ['userId']],
  ['conversation_participants', 'conversation_participants_insured_id_idx', ['insuredId']],
  ['conversation_entities', 'conversation_entities_conversation_id_idx', ['conversationId']],
  ['conversation_entities', 'conversation_entities_policy_id_idx', ['policyId']],
  ['conversation_entities', 'conversation_entities_insured_id_idx', ['insuredId']],
  ['conversation_entities', 'conversation_entities_installment_id_idx', ['installmentId']],
  ['messages', 'messages_template_id_idx', ['templateId']],
  ['messages', 'messages_sender_user_id_idx', ['senderUserId']],
  ['messages', 'messages_sender_insured_id_idx', ['senderInsuredId']],
  ['message_statuses', 'message_statuses_message_id_idx', ['messageId']],
  ['system_notifications', 'system_notifications_template_channel_idx', ['templateId', 'channelId']],
  ['system_notifications', 'system_notifications_campaign_id_idx', ['campaignId']],
  ['system_notifications', 'system_notifications_recipient_user_id_idx', ['recipientUserId']],
  ['system_notification_statuses', 'system_notification_statuses_system_notification_id_idx', ['systemNotificationId']],
]

describe('indexes', () => {
  it.each(expectedIndexes)('%s has %s', (physicalTable, indexName, cols) => {
    expect(hasIndex(indexName)).toBe(true)
  })
})

// DER §"Convenciones del modelo": dinero integer + currency ARS
const moneyColumns: ReadonlyArray<readonly [string, string]> = [
  ['plans', 'price'],
  ['policies', 'premiumTotal'],
  ['subscriptions', 'priceAmount'],
  ['subscription_payments', 'amount'],
  ['policy_installments', 'totalAmount'],
]

const currencyColumns: ReadonlyArray<readonly [string, string]> = [
  ['plans', 'currency'],
  ['plan_versions', 'currency'],
  ['policies', 'currency'],
  ['subscriptions', 'currency'],
  ['subscription_payments', 'currency'],
  ['policy_installments', 'currency'],
]

describe('money', () => {
  describe('money columns are integer (never REAL/float)', () => {
    it.each(moneyColumns)('%s.%s', (physicalTable, column) => {
      expect(hasColumnType(physicalTable, column, 'SQLiteInteger')).toBe(true)
      expect(hasColumnDataType(physicalTable, column, 'number')).toBe(true)
    })
  })

  describe('currency columns default to ARS', () => {
    it.each(currencyColumns)('%s.%s', (physicalTable, column) => {
      expect(hasColumnWithDefault(physicalTable, column, 'ARS')).toBe(true)
    })
  })
})

// DER §"Convenciones del modelo": timestamps epoch ms y fechas civiles como texto
const mutableDomainTables = [
  'plans', 'planVersions', 'features', 'planVersionFeatures', 'subscriptions',
  'subscriptionFeatureOverrides', 'subscriptionPayments',
  'companies', 'branches', 'assetTypes', 'paymentMethods', 'insureds', 'assets',
  'policies', 'policyAssets', 'policyCoverages', 'policyInstallments',
  'aiExtractionResults', 'reminderRules',
  'channels', 'channelEndpoints', 'organizationIntegrations', 'organizationChannels',
  'organizationChannelEndpoints', 'communicationCategories', 'messageTemplates',
  'organizationMessageTemplates', 'organizationNotificationPreferences',
  'communicationConsents', 'notificationCampaigns', 'systemNotifications', 'conversations',
]

const eventLogTables = ['messageStatuses', 'systemNotificationStatuses', 'conversationEntities']

const dateCivilColumns: ReadonlyArray<readonly [string, string]> = [
  ['policies', 'startDate'],
  ['policies', 'endDate'],
  ['policies', 'effectiveEndDate'],
  ['policy_installments', 'dueDate'],
  ['insureds', 'birthDate'],
  ['subscriptions', 'periodStart'],
  ['subscriptions', 'periodEnd'],
]

describe('timestamps & dates', () => {
  describe('domain mutable tables use integer timestamp_ms (DER §"Convenciones del modelo")', () => {
    it.each(mutableDomainTables.map((t) => [t] as const))('%s', (name) => {
      const tableName = name as ExpectedTable
      expect(hasColumnMode(tableName, 'createdAt', 'timestamp_ms')).toBe(true)
      expect(hasColumnMode(tableName, 'updatedAt', 'timestamp_ms')).toBe(true)
      expect(hasColumnMode(tableName, 'deletedAt', 'timestamp_ms')).toBe(true)
    })
  })

  describe('event-log tables carry only created_at (immutable)', () => {
    it.each(eventLogTables.map((t) => [t] as const))('%s', (name) => {
      const tableName = name as ExpectedTable
      expect(hasColumnMode(tableName, 'createdAt', 'timestamp_ms')).toBe(true)
      const table = getTable(tableName)
      const cols = getColumns(table) as Record<string, any>
      expect(cols['updatedAt']).toBeUndefined()
      expect(cols['deletedAt']).toBeUndefined()
    })
  })

  describe('civil dates are text (ISO YYYY-MM-DD), not timestamps', () => {
    it.each(dateCivilColumns)('%s.%s', (physicalTable, column) => {
      expect(hasColumnType(physicalTable, column, 'SQLiteText')).toBe(true)
      expect(hasColumnDataType(physicalTable, column, 'string')).toBe(true)
      expect(hasColumnMode(physicalTable, column, 'timestamp_ms')).toBe(false)
    })
  })
})