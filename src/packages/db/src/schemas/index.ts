import {
  account,
  invitation,
  member,
  organization,
  rateLimit,
  session,
  user,
  verification,
} from '@copas/auth'
import { aiExtractionResults } from '../contexts/ai'
import {
  features,
  planVersionFeatures,
  planVersions,
  plans,
  subscriptionFeatureOverrides,
  subscriptionPayments,
  subscriptions,
} from '../contexts/billing'
import {
  channelEndpoints,
  channels,
  communicationCategories,
  communicationConsents,
  conversationEntities,
  conversationParticipants,
  conversations,
  messageStatuses,
  messageTemplates,
  messages,
  notificationCampaigns,
  organizationChannelEndpoints,
  organizationChannels,
  organizationIntegrations,
  organizationMessageTemplates,
  organizationNotificationPreferences,
  systemNotificationStatuses,
  systemNotifications,
} from '../contexts/communications'
import {
  assetTypes,
  assets,
  branches,
  companies,
  insureds,
  paymentMethods,
  policies,
  policyAssets,
  policyCoverages,
  policyInstallments,
} from '../contexts/insurance'
import { reminderRules } from '../contexts/reminders'

/**
 * Mapa de tablas de Drizzle (sin relations) para el runtime y `drizzle-kit`.
 * Las relations v2 centralizadas viven en `./relations` (`dbRelations`),
 * consumidas por la instancia `drizzle()` en los apps.
 */
export const dbSchema = {
  // auth
  user,
  session,
  account,
  verification,
  organization,
  member,
  invitation,
  rateLimit,
  // billing
  plans,
  planVersions,
  features,
  planVersionFeatures,
  subscriptions,
  subscriptionFeatureOverrides,
  subscriptionPayments,
  // insurance
  companies,
  branches,
  assetTypes,
  paymentMethods,
  insureds,
  assets,
  policies,
  policyAssets,
  policyCoverages,
  policyInstallments,
  // ai
  aiExtractionResults,
  // reminders
  reminderRules,
  // communications
  channels,
  channelEndpoints,
  organizationIntegrations,
  organizationChannels,
  organizationChannelEndpoints,
  communicationCategories,
  messageTemplates,
  organizationMessageTemplates,
  organizationNotificationPreferences,
  communicationConsents,
  notificationCampaigns,
  systemNotifications,
  systemNotificationStatuses,
  conversations,
  conversationParticipants,
  conversationEntities,
  messages,
  messageStatuses,
}

export { dbDomainRelations, dbRelations, tables } from './relations'

export * from '@copas/auth'
export * from '../contexts/billing'
export * from '../contexts/insurance'
export * from '../contexts/ai'
export * from '../contexts/reminders'
export * from '../contexts/communications'