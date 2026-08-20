import { defineRelations } from 'drizzle-orm'

import {
  account,
  authRelations,
  invitation,
  member,
  organization,
  rateLimit,
  session,
  user,
  verification,
} from '@copas/auth'

import { aiExtractionResults } from '../contexts/ai/ai-extraction-results.schema'
import { planVersionFeatures } from '../contexts/billing/plan-version-features.schema'
import { planVersions } from '../contexts/billing/plan-versions.schema'
import { plans } from '../contexts/billing/plans.schema'
import { subscriptionFeatureOverrides } from '../contexts/billing/subscription-feature-overrides.schema'
import { subscriptionPayments } from '../contexts/billing/subscription-payments.schema'
import { subscriptions } from '../contexts/billing/subscriptions.schema'
import { features } from '../contexts/billing/features.schema'
import { channelEndpoints } from '../contexts/communications/channel-endpoints.schema'
import { channels } from '../contexts/communications/channels.schema'
import { communicationCategories } from '../contexts/communications/communication-categories.schema'
import { communicationConsents } from '../contexts/communications/communication-consents.schema'
import { conversationEntities } from '../contexts/communications/conversation-entities.schema'
import { conversationParticipants } from '../contexts/communications/conversation-participants.schema'
import { conversations } from '../contexts/communications/conversations.schema'
import { messageStatuses } from '../contexts/communications/message-statuses.schema'
import { messageTemplates } from '../contexts/communications/message-templates.schema'
import { messages } from '../contexts/communications/messages.schema'
import { notificationCampaigns } from '../contexts/communications/notification-campaigns.schema'
import { organizationChannelEndpoints } from '../contexts/communications/organization-channel-endpoints.schema'
import { organizationChannels } from '../contexts/communications/organization-channels.schema'
import { organizationIntegrations } from '../contexts/communications/organization-integrations.schema'
import { organizationMessageTemplates } from '../contexts/communications/organization-message-templates.schema'
import { organizationNotificationPreferences } from '../contexts/communications/organization-notification-preferences.schema'
import { systemNotificationStatuses } from '../contexts/communications/system-notification-statuses.schema'
import { systemNotifications } from '../contexts/communications/system-notifications.schema'
import { assetTypes } from '../contexts/insurance/asset-types.schema'
import { assets } from '../contexts/insurance/assets.schema'
import { branches } from '../contexts/insurance/branches.schema'
import { companies } from '../contexts/insurance/companies.schema'
import { insureds } from '../contexts/insurance/insureds.schema'
import { paymentMethods } from '../contexts/insurance/payment-methods.schema'
import { policies } from '../contexts/insurance/policies.schema'
import { policyAssets } from '../contexts/insurance/policy-assets.schema'
import { policyCoverages } from '../contexts/insurance/policy-coverages.schema'
import { policyInstallments } from '../contexts/insurance/policy-installments.schema'
import { reminderRules } from '../contexts/reminders/reminder-rules.schema'

export const tables = {
  user,
  session,
  account,
  verification,
  organization,
  member,
  invitation,
  rateLimit,
  plans,
  planVersions,
  features,
  planVersionFeatures,
  subscriptions,
  subscriptionFeatureOverrides,
  subscriptionPayments,
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
  aiExtractionResults,
  reminderRules,
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

export const dbDomainRelations = defineRelations(tables, (r) => ({
  plans: {
    planVersions: r.many.planVersions({
      from: r.plans.id,
      to: r.planVersions.planId,
    }),
  },
  planVersions: {
    plan: r.one.plans({
      from: r.planVersions.planId,
      to: r.plans.id,
    }),
    planVersionFeatures: r.many.planVersionFeatures({
      from: r.planVersions.id,
      to: r.planVersionFeatures.planVersionId,
    }),
    subscriptions: r.many.subscriptions({
      from: r.planVersions.id,
      to: r.subscriptions.planVersionId,
    }),
  },
  features: {
    planVersionFeatures: r.many.planVersionFeatures({
      from: r.features.id,
      to: r.planVersionFeatures.featureId,
    }),
    subscriptionFeatureOverrides: r.many.subscriptionFeatureOverrides({
      from: r.features.id,
      to: r.subscriptionFeatureOverrides.featureId,
    }),
  },
  planVersionFeatures: {
    planVersion: r.one.planVersions({
      from: r.planVersionFeatures.planVersionId,
      to: r.planVersions.id,
    }),
    feature: r.one.features({
      from: r.planVersionFeatures.featureId,
      to: r.features.id,
    }),
  },
  subscriptions: {
    organization: r.one.organization({
      from: r.subscriptions.organizationId,
      to: r.organization.id,
    }),
    planVersion: r.one.planVersions({
      from: r.subscriptions.planVersionId,
      to: r.planVersions.id,
    }),
    subscriptionFeatureOverrides: r.many.subscriptionFeatureOverrides({
      from: r.subscriptions.id,
      to: r.subscriptionFeatureOverrides.subscriptionId,
    }),
    subscriptionPayments: r.many.subscriptionPayments({
      from: r.subscriptions.id,
      to: r.subscriptionPayments.subscriptionId,
    }),
  },
  subscriptionFeatureOverrides: {
    subscription: r.one.subscriptions({
      from: r.subscriptionFeatureOverrides.subscriptionId,
      to: r.subscriptions.id,
    }),
    feature: r.one.features({
      from: r.subscriptionFeatureOverrides.featureId,
      to: r.features.id,
    }),
  },
  subscriptionPayments: {
    organization: r.one.organization({
      from: r.subscriptionPayments.organizationId,
      to: r.organization.id,
    }),
    subscription: r.one.subscriptions({
      from: r.subscriptionPayments.subscriptionId,
      to: r.subscriptions.id,
    }),
  },
  companies: {
    policies: r.many.policies({
      from: r.companies.id,
      to: r.policies.companyId,
    }),
  },
  branches: {
    assetTypes: r.many.assetTypes({
      from: r.branches.id,
      to: r.assetTypes.branchId,
    }),
  },
  assetTypes: {
    branch: r.one.branches({
      from: r.assetTypes.branchId,
      to: r.branches.id,
    }),
    assets: r.many.assets({
      from: r.assetTypes.id,
      to: r.assets.assetTypeId,
    }),
  },
  paymentMethods: {
    policies: r.many.policies({
      from: r.paymentMethods.id,
      to: r.policies.paymentMethodId,
    }),
  },
  insureds: {
    organization: r.one.organization({
      from: r.insureds.organizationId,
      to: r.organization.id,
    }),
    uploadedByUser: r.one.user({
      from: r.insureds.uploadedBy,
      to: r.user.id,
    }),
    assets: r.many.assets({
      from: r.insureds.id,
      to: r.assets.insuredId,
    }),
    policies: r.many.policies({
      from: r.insureds.id,
      to: r.policies.insuredId,
    }),
    communicationConsents: r.many.communicationConsents({
      from: r.insureds.id,
      to: r.communicationConsents.insuredId,
    }),
    conversations: r.many.conversations({
      from: r.insureds.id,
      to: r.conversations.insuredId,
    }),
    conversationParticipants: r.many.conversationParticipants({
      from: r.insureds.id,
      to: r.conversationParticipants.insuredId,
    }),
    conversationEntities: r.many.conversationEntities({
      from: r.insureds.id,
      to: r.conversationEntities.insuredId,
    }),
  },
  assets: {
    insured: r.one.insureds({
      from: r.assets.insuredId,
      to: r.insureds.id,
    }),
    assetType: r.one.assetTypes({
      from: r.assets.assetTypeId,
      to: r.assetTypes.id,
    }),
    uploadedByUser: r.one.user({
      from: r.assets.uploadedBy,
      to: r.user.id,
    }),
    policyAssets: r.many.policyAssets({
      from: r.assets.id,
      to: r.policyAssets.assetId,
    }),
  },
  policies: {
    organization: r.one.organization({
      from: r.policies.organizationId,
      to: r.organization.id,
    }),
    company: r.one.companies({
      from: r.policies.companyId,
      to: r.companies.id,
    }),
    insured: r.one.insureds({
      from: r.policies.insuredId,
      to: r.insureds.id,
    }),
    paymentMethod: r.one.paymentMethods({
      from: r.policies.paymentMethodId,
      to: r.paymentMethods.id,
    }),
    uploadedByUser: r.one.user({
      from: r.policies.uploadedBy,
      to: r.user.id,
    }),
    producedByUser: r.one.user({
      from: r.policies.producedBy,
      to: r.user.id,
    }),
    policyAssets: r.many.policyAssets({
      from: r.policies.id,
      to: r.policyAssets.policyId,
    }),
    policyCoverages: r.many.policyCoverages({
      from: r.policies.id,
      to: r.policyCoverages.policyId,
    }),
    policyInstallments: r.many.policyInstallments({
      from: r.policies.id,
      to: r.policyInstallments.policyId,
    }),
    aiExtractionResults: r.many.aiExtractionResults({
      from: r.policies.id,
      to: r.aiExtractionResults.policyId,
    }),
    conversationEntities: r.many.conversationEntities({
      from: r.policies.id,
      to: r.conversationEntities.policyId,
    }),
  },
  policyAssets: {
    policy: r.one.policies({
      from: r.policyAssets.policyId,
      to: r.policies.id,
    }),
    asset: r.one.assets({
      from: r.policyAssets.assetId,
      to: r.assets.id,
    }),
  },
  policyCoverages: {
    policy: r.one.policies({
      from: r.policyCoverages.policyId,
      to: r.policies.id,
    }),
  },
  policyInstallments: {
    organization: r.one.organization({
      from: r.policyInstallments.organizationId,
      to: r.organization.id,
    }),
    policy: r.one.policies({
      from: r.policyInstallments.policyId,
      to: r.policies.id,
    }),
    uploadedByUser: r.one.user({
      from: r.policyInstallments.uploadedBy,
      to: r.user.id,
    }),
    conversationEntities: r.many.conversationEntities({
      from: r.policyInstallments.id,
      to: r.conversationEntities.installmentId,
    }),
  },
  aiExtractionResults: {
    policy: r.one.policies({
      from: r.aiExtractionResults.policyId,
      to: r.policies.id,
    }),
    reviewedByUser: r.one.user({
      from: r.aiExtractionResults.reviewedBy,
      to: r.user.id,
    }),
  },
  reminderRules: {
    organization: r.one.organization({
      from: r.reminderRules.organizationId,
      to: r.organization.id,
    }),
    template: r.one.messageTemplates({
      from: r.reminderRules.templateId,
      to: r.messageTemplates.id,
    }),
  },
  channels: {
    channelEndpoints: r.many.channelEndpoints({
      from: r.channels.id,
      to: r.channelEndpoints.channelId,
    }),
    organizationChannels: r.many.organizationChannels({
      from: r.channels.id,
      to: r.organizationChannels.channelId,
    }),
    messageTemplates: r.many.messageTemplates({
      from: r.channels.id,
      to: r.messageTemplates.channelId,
    }),
    systemNotifications: r.many.systemNotifications({
      from: r.channels.id,
      to: r.systemNotifications.channelId,
    }),
  },
  channelEndpoints: {
    channel: r.one.channels({
      from: r.channelEndpoints.channelId,
      to: r.channels.id,
    }),
    ownerOrganization: r.one.organization({
      from: r.channelEndpoints.ownerOrganizationId,
      to: r.organization.id,
    }),
    organizationChannelEndpoints: r.many.organizationChannelEndpoints({
      from: r.channelEndpoints.id,
      to: r.organizationChannelEndpoints.endpointId,
    }),
  },
  organizationIntegrations: {
    organization: r.one.organization({
      from: r.organizationIntegrations.organizationId,
      to: r.organization.id,
    }),
    organizationChannels: r.many.organizationChannels({
      from: r.organizationIntegrations.id,
      to: r.organizationChannels.integrationId,
    }),
  },
  organizationChannels: {
    organization: r.one.organization({
      from: r.organizationChannels.organizationId,
      to: r.organization.id,
    }),
    channel: r.one.channels({
      from: r.organizationChannels.channelId,
      to: r.channels.id,
    }),
    integration: r.one.organizationIntegrations({
      from: r.organizationChannels.integrationId,
      to: r.organizationIntegrations.id,
    }),
    organizationChannelEndpoints: r.many.organizationChannelEndpoints({
      from: r.organizationChannels.id,
      to: r.organizationChannelEndpoints.organizationChannelId,
    }),
  },
  organizationChannelEndpoints: {
    organizationChannel: r.one.organizationChannels({
      from: r.organizationChannelEndpoints.organizationChannelId,
      to: r.organizationChannels.id,
    }),
    endpoint: r.one.channelEndpoints({
      from: r.organizationChannelEndpoints.endpointId,
      to: r.channelEndpoints.id,
    }),
    conversations: r.many.conversations({
      from: r.organizationChannelEndpoints.id,
      to: r.conversations.organizationChannelEndpointId,
    }),
  },
  communicationCategories: {
    messageTemplates: r.many.messageTemplates({
      from: r.communicationCategories.id,
      to: r.messageTemplates.categoryId,
    }),
    organizationNotificationPreferences: r.many.organizationNotificationPreferences({
      from: r.communicationCategories.id,
      to: r.organizationNotificationPreferences.categoryId,
    }),
    communicationConsents: r.many.communicationConsents({
      from: r.communicationCategories.id,
      to: r.communicationConsents.categoryId,
    }),
  },
  messageTemplates: {
    channel: r.one.channels({
      from: r.messageTemplates.channelId,
      to: r.channels.id,
    }),
    category: r.one.communicationCategories({
      from: r.messageTemplates.categoryId,
      to: r.communicationCategories.id,
    }),
    organizationMessageTemplates: r.many.organizationMessageTemplates({
      from: r.messageTemplates.id,
      to: r.organizationMessageTemplates.templateId,
    }),
    reminderRules: r.many.reminderRules({
      from: r.messageTemplates.id,
      to: r.reminderRules.templateId,
    }),
    systemNotifications: r.many.systemNotifications({
      from: r.messageTemplates.id,
      to: r.systemNotifications.templateId,
    }),
    messages: r.many.messages({
      from: r.messageTemplates.id,
      to: r.messages.templateId,
    }),
  },
  organizationMessageTemplates: {
    organization: r.one.organization({
      from: r.organizationMessageTemplates.organizationId,
      to: r.organization.id,
    }),
    template: r.one.messageTemplates({
      from: r.organizationMessageTemplates.templateId,
      to: r.messageTemplates.id,
    }),
  },
  organizationNotificationPreferences: {
    organization: r.one.organization({
      from: r.organizationNotificationPreferences.organizationId,
      to: r.organization.id,
    }),
    category: r.one.communicationCategories({
      from: r.organizationNotificationPreferences.categoryId,
      to: r.communicationCategories.id,
    }),
  },
  communicationConsents: {
    organization: r.one.organization({
      from: r.communicationConsents.organizationId,
      to: r.organization.id,
    }),
    insured: r.one.insureds({
      from: r.communicationConsents.insuredId,
      to: r.insureds.id,
    }),
    category: r.one.communicationCategories({
      from: r.communicationConsents.categoryId,
      to: r.communicationCategories.id,
    }),
  },
  notificationCampaigns: {
    organization: r.one.organization({
      from: r.notificationCampaigns.organizationId,
      to: r.organization.id,
    }),
    systemNotifications: r.many.systemNotifications({
      from: r.notificationCampaigns.id,
      to: r.systemNotifications.campaignId,
    }),
    conversations: r.many.conversations({
      from: r.notificationCampaigns.id,
      to: r.conversations.campaignId,
    }),
  },
  systemNotifications: {
    organization: r.one.organization({
      from: r.systemNotifications.organizationId,
      to: r.organization.id,
    }),
    channel: r.one.channels({
      from: r.systemNotifications.channelId,
      to: r.channels.id,
    }),
    template: r.one.messageTemplates({
      from: r.systemNotifications.templateId,
      to: r.messageTemplates.id,
    }),
    campaign: r.one.notificationCampaigns({
      from: r.systemNotifications.campaignId,
      to: r.notificationCampaigns.id,
    }),
    recipientUser: r.one.user({
      from: r.systemNotifications.recipientUserId,
      to: r.user.id,
    }),
    systemNotificationStatuses: r.many.systemNotificationStatuses({
      from: r.systemNotifications.id,
      to: r.systemNotificationStatuses.systemNotificationId,
    }),
  },
  systemNotificationStatuses: {
    systemNotification: r.one.systemNotifications({
      from: r.systemNotificationStatuses.systemNotificationId,
      to: r.systemNotifications.id,
    }),
  },
  conversations: {
    organization: r.one.organization({
      from: r.conversations.organizationId,
      to: r.organization.id,
    }),
    organizationChannelEndpoint: r.one.organizationChannelEndpoints({
      from: r.conversations.organizationChannelEndpointId,
      to: r.organizationChannelEndpoints.id,
    }),
    insured: r.one.insureds({
      from: r.conversations.insuredId,
      to: r.insureds.id,
    }),
    campaign: r.one.notificationCampaigns({
      from: r.conversations.campaignId,
      to: r.notificationCampaigns.id,
    }),
    conversationParticipants: r.many.conversationParticipants({
      from: r.conversations.id,
      to: r.conversationParticipants.conversationId,
    }),
    conversationEntities: r.many.conversationEntities({
      from: r.conversations.id,
      to: r.conversationEntities.conversationId,
    }),
    messages: r.many.messages({
      from: r.conversations.id,
      to: r.messages.conversationId,
    }),
  },
  conversationParticipants: {
    conversation: r.one.conversations({
      from: r.conversationParticipants.conversationId,
      to: r.conversations.id,
    }),
    user: r.one.user({
      from: r.conversationParticipants.userId,
      to: r.user.id,
    }),
    insured: r.one.insureds({
      from: r.conversationParticipants.insuredId,
      to: r.insureds.id,
    }),
  },
  conversationEntities: {
    conversation: r.one.conversations({
      from: r.conversationEntities.conversationId,
      to: r.conversations.id,
    }),
    policy: r.one.policies({
      from: r.conversationEntities.policyId,
      to: r.policies.id,
    }),
    insured: r.one.insureds({
      from: r.conversationEntities.insuredId,
      to: r.insureds.id,
    }),
    installment: r.one.policyInstallments({
      from: r.conversationEntities.installmentId,
      to: r.policyInstallments.id,
    }),
    linkedByUser: r.one.user({
      from: r.conversationEntities.linkedBy,
      to: r.user.id,
    }),
  },
  messages: {
    conversation: r.one.conversations({
      from: r.messages.conversationId,
      to: r.conversations.id,
    }),
    organization: r.one.organization({
      from: r.messages.organizationId,
      to: r.organization.id,
    }),
    template: r.one.messageTemplates({
      from: r.messages.templateId,
      to: r.messageTemplates.id,
    }),
    senderUser: r.one.user({
      from: r.messages.senderUserId,
      to: r.user.id,
    }),
    senderInsured: r.one.insureds({
      from: r.messages.senderInsuredId,
      to: r.insureds.id,
    }),
    messageStatuses: r.many.messageStatuses({
      from: r.messages.id,
      to: r.messageStatuses.messageId,
    }),
  },
  messageStatuses: {
    message: r.one.messages({
      from: r.messageStatuses.messageId,
      to: r.messages.id,
    }),
  },
}))

export const dbRelations = { ...dbDomainRelations, ...authRelations }