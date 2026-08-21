CREATE TABLE `account` (
	`id` text PRIMARY KEY,
	`issuer` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `invitation` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`inviter_id` text NOT NULL,
	CONSTRAINT `fk_invitation_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_invitation_inviter_id_user_id_fk` FOREIGN KEY (`inviter_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `member` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_member_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_member_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `organization` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo` text,
	`created_at` integer NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `rate_limit` (
	`id` text PRIMARY KEY,
	`key` text NOT NULL UNIQUE,
	`count` integer NOT NULL,
	`last_request` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`impersonated_by` text,
	`active_organization_id` text,
	CONSTRAINT `fk_session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`role` text,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_extraction_results` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`policyId` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`result` text,
	`corrections` text,
	`reviewedBy` text,
	`reviewedAt` integer,
	`model` text,
	CONSTRAINT `fk_ai_extraction_results_policyId_policies_id_fk` FOREIGN KEY (`policyId`) REFERENCES `policies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_ai_extraction_results_reviewedBy_user_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `user`(`id`),
	CONSTRAINT "ai_extraction_results_status_check" CHECK("status" IN ('pending', 'processing', 'on_review', 'approved', 'approved_with_corrections', 'failed')),
	CONSTRAINT "ai_extraction_results_result_json" CHECK(json_valid("result")),
	CONSTRAINT "ai_extraction_results_corrections_json" CHECK(json_valid("corrections"))
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'ARS' NOT NULL,
	`interval` text DEFAULT 'month' NOT NULL,
	`limits` text,
	CONSTRAINT "plans_interval_check" CHECK("interval" IN ('month', 'quarter', 'year')),
	CONSTRAINT "plans_limits_json" CHECK(json_valid("limits"))
);
--> statement-breakpoint
CREATE TABLE `plan_versions` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`planId` text NOT NULL,
	`version` integer NOT NULL,
	`name` text NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'ARS' NOT NULL,
	`interval` text DEFAULT 'month' NOT NULL,
	`limits` text,
	CONSTRAINT `fk_plan_versions_planId_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE CASCADE,
	CONSTRAINT "plan_versions_interval_check" CHECK("interval" IN ('month', 'quarter', 'year')),
	CONSTRAINT "plan_versions_limits_json" CHECK(json_valid("limits"))
);
--> statement-breakpoint
CREATE TABLE `features` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `plan_version_features` (
	`planVersionId` text NOT NULL,
	`featureId` text NOT NULL,
	`featureLimit` integer,
	`isEnabled` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `plan_version_features_pk` PRIMARY KEY(`planVersionId`, `featureId`),
	CONSTRAINT `fk_plan_version_features_planVersionId_plan_versions_id_fk` FOREIGN KEY (`planVersionId`) REFERENCES `plan_versions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_plan_version_features_featureId_features_id_fk` FOREIGN KEY (`featureId`) REFERENCES `features`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`organizationId` text NOT NULL,
	`planVersionId` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`priceAmount` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'ARS' NOT NULL,
	`periodStart` text,
	`periodEnd` text,
	CONSTRAINT `fk_subscriptions_organizationId_organization_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_subscriptions_planVersionId_plan_versions_id_fk` FOREIGN KEY (`planVersionId`) REFERENCES `plan_versions`(`id`) ON DELETE RESTRICT,
	CONSTRAINT "subscriptions_status_check" CHECK("status" IN ('active', 'past_due', 'canceled', 'expired'))
);
--> statement-breakpoint
CREATE TABLE `subscription_feature_overrides` (
	`subscriptionId` text NOT NULL,
	`featureId` text NOT NULL,
	`overrideLimit` integer,
	`isEnabled` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `subscription_feature_overrides_pk` PRIMARY KEY(`subscriptionId`, `featureId`),
	CONSTRAINT `fk_subscription_feature_overrides_subscriptionId_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_subscription_feature_overrides_featureId_features_id_fk` FOREIGN KEY (`featureId`) REFERENCES `features`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `subscription_payments` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`organizationId` text NOT NULL,
	`subscriptionId` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'ARS' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`gatewayTransactionId` text,
	`paymentDate` integer,
	CONSTRAINT `fk_subscription_payments_organizationId_organization_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_subscription_payments_subscriptionId_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE CASCADE,
	CONSTRAINT "subscription_payments_status_check" CHECK("status" IN ('pending', 'paid', 'failed', 'refunded'))
);
--> statement-breakpoint
CREATE TABLE `channels` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`code` text,
	`name` text NOT NULL,
	`description` text,
	`isSystem` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `channel_endpoints` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`channelId` text NOT NULL,
	`number` text,
	`provider` text NOT NULL,
	`ownerKind` text DEFAULT 'platform' NOT NULL,
	`ownerOrganizationId` text,
	`status` text DEFAULT 'active' NOT NULL,
	CONSTRAINT `fk_channel_endpoints_channelId_channels_id_fk` FOREIGN KEY (`channelId`) REFERENCES `channels`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_channel_endpoints_ownerOrganizationId_organization_id_fk` FOREIGN KEY (`ownerOrganizationId`) REFERENCES `organization`(`id`),
	CONSTRAINT "channel_endpoints_provider_check" CHECK("provider" IN ('whatsapp_cloud', 'email_service')),
	CONSTRAINT "channel_endpoints_owner_kind_check" CHECK("ownerKind" IN ('platform', 'organization')),
	CONSTRAINT "channel_endpoints_status_check" CHECK("status" IN ('active', 'inactive', 'released')),
	CONSTRAINT "channel_endpoints_owner_organization_coherence" CHECK(CASE "ownerKind"
        WHEN 'organization' THEN "ownerOrganizationId" IS NOT NULL
        WHEN 'platform' THEN "ownerOrganizationId" IS NULL
      END)
);
--> statement-breakpoint
CREATE TABLE `organization_integrations` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`organizationId` text NOT NULL,
	`provider` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`credentials` text,
	`config` text,
	CONSTRAINT `fk_organization_integrations_organizationId_organization_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT "organization_integrations_provider_check" CHECK("provider" IN ('whatsapp_cloud', 'email_service')),
	CONSTRAINT "organization_integrations_status_check" CHECK("status" IN ('active', 'pending', 'error', 'disabled')),
	CONSTRAINT "organization_integrations_credentials_json" CHECK(json_valid("credentials")),
	CONSTRAINT "organization_integrations_config_json" CHECK(json_valid("config"))
);
--> statement-breakpoint
CREATE TABLE `organization_channels` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`organizationId` text NOT NULL,
	`channelId` text NOT NULL,
	`integrationId` text,
	`isEnabled` integer DEFAULT false NOT NULL,
	`config` text,
	CONSTRAINT `fk_organization_channels_organizationId_organization_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_organization_channels_channelId_channels_id_fk` FOREIGN KEY (`channelId`) REFERENCES `channels`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_organization_channels_integrationId_organization_integrations_id_fk` FOREIGN KEY (`integrationId`) REFERENCES `organization_integrations`(`id`),
	CONSTRAINT "organization_channels_config_json" CHECK(json_valid("config"))
);
--> statement-breakpoint
CREATE TABLE `organization_channel_endpoints` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`organizationChannelId` text NOT NULL,
	`endpointId` text NOT NULL,
	`label` text,
	`isPrimary` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`assignedAt` integer,
	CONSTRAINT `fk_organization_channel_endpoints_organizationChannelId_organization_channels_id_fk` FOREIGN KEY (`organizationChannelId`) REFERENCES `organization_channels`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_organization_channel_endpoints_endpointId_channel_endpoints_id_fk` FOREIGN KEY (`endpointId`) REFERENCES `channel_endpoints`(`id`) ON DELETE CASCADE,
	CONSTRAINT "organization_channel_endpoints_status_check" CHECK("status" IN ('active', 'suspended', 'released'))
);
--> statement-breakpoint
CREATE TABLE `communication_categories` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`code` text,
	`name` text NOT NULL,
	`isMandatory` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `message_templates` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`channelId` text NOT NULL,
	`categoryId` text NOT NULL,
	`code` text,
	`name` text NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`variables` text,
	`isSystemBase` integer DEFAULT false NOT NULL,
	CONSTRAINT `fk_message_templates_channelId_channels_id_fk` FOREIGN KEY (`channelId`) REFERENCES `channels`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_message_templates_categoryId_communication_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `communication_categories`(`id`) ON DELETE RESTRICT,
	CONSTRAINT "message_templates_variables_json" CHECK(json_valid("variables"))
);
--> statement-breakpoint
CREATE TABLE `organization_message_templates` (
	`organizationId` text NOT NULL,
	`templateId` text NOT NULL,
	`isEnabled` integer DEFAULT false NOT NULL,
	`customOverrides` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `organization_message_templates_pk` PRIMARY KEY(`organizationId`, `templateId`),
	CONSTRAINT `fk_organization_message_templates_organizationId_organization_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_organization_message_templates_templateId_message_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `message_templates`(`id`) ON DELETE CASCADE,
	CONSTRAINT "organization_message_templates_custom_overrides_json" CHECK(json_valid("customOverrides"))
);
--> statement-breakpoint
CREATE TABLE `organization_notification_preferences` (
	`organizationId` text NOT NULL,
	`categoryId` text NOT NULL,
	`isEnabled` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `organization_notification_preferences_pk` PRIMARY KEY(`organizationId`, `categoryId`),
	CONSTRAINT `fk_organization_notification_preferences_organizationId_organization_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_organization_notification_preferences_categoryId_communication_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `communication_categories`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `communication_consents` (
	`organizationId` text NOT NULL,
	`insuredId` text NOT NULL,
	`categoryId` text NOT NULL,
	`isOptedOut` integer DEFAULT false NOT NULL,
	`optOutAt` integer,
	`optOutReason` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `communication_consents_pk` PRIMARY KEY(`organizationId`, `insuredId`, `categoryId`),
	CONSTRAINT `fk_communication_consents_organizationId_organization_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_communication_consents_insuredId_insureds_id_fk` FOREIGN KEY (`insuredId`) REFERENCES `insureds`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_communication_consents_categoryId_communication_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `communication_categories`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `notification_campaigns` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`organizationId` text NOT NULL,
	`campaignOrigin` text DEFAULT 'system' NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`metadata` text,
	CONSTRAINT `fk_notification_campaigns_organizationId_organization_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT "notification_campaigns_campaign_origin_check" CHECK("campaignOrigin" IN ('system', 'manual', 'scheduled')),
	CONSTRAINT "notification_campaigns_type_check" CHECK("type" IN ('renewal_reminder', 'installment_due', 'payment_confirmation', 'custom')),
	CONSTRAINT "notification_campaigns_metadata_json" CHECK(json_valid("metadata"))
);
--> statement-breakpoint
CREATE TABLE `system_notifications` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`organizationId` text NOT NULL,
	`channelId` text NOT NULL,
	`templateId` text NOT NULL,
	`campaignId` text,
	`recipientUserId` text,
	`recipientAddress` text,
	`content` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`sentAt` integer,
	CONSTRAINT `fk_system_notifications_organizationId_organization_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_system_notifications_channelId_channels_id_fk` FOREIGN KEY (`channelId`) REFERENCES `channels`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_system_notifications_campaignId_notification_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `notification_campaigns`(`id`),
	CONSTRAINT `fk_system_notifications_recipientUserId_user_id_fk` FOREIGN KEY (`recipientUserId`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_system_notifications_templateId_channelId_message_templates_id_channelId_fk` FOREIGN KEY (`templateId`,`channelId`) REFERENCES `message_templates`(`id`,`channelId`),
	CONSTRAINT "system_notifications_status_check" CHECK("status" IN ('pending', 'sent', 'delivered', 'read', 'failed', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE `system_notification_statuses` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`systemNotificationId` text NOT NULL,
	`status` text NOT NULL,
	`occurredAt` integer NOT NULL,
	`details` text,
	CONSTRAINT `fk_system_notification_statuses_systemNotificationId_system_notifications_id_fk` FOREIGN KEY (`systemNotificationId`) REFERENCES `system_notifications`(`id`) ON DELETE CASCADE,
	CONSTRAINT "system_notification_statuses_status_check" CHECK("status" IN ('pending', 'sent', 'delivered', 'read', 'failed', 'skipped')),
	CONSTRAINT "system_notification_statuses_details_json" CHECK(json_valid("details"))
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`organizationId` text NOT NULL,
	`organizationChannelEndpointId` text,
	`insuredId` text,
	`campaignId` text,
	`type` text NOT NULL,
	`subject` text,
	`status` text DEFAULT 'open' NOT NULL,
	`metadata` text,
	CONSTRAINT `fk_conversations_organizationId_organization_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_conversations_organizationChannelEndpointId_organization_channel_endpoints_id_fk` FOREIGN KEY (`organizationChannelEndpointId`) REFERENCES `organization_channel_endpoints`(`id`),
	CONSTRAINT `fk_conversations_insuredId_insureds_id_fk` FOREIGN KEY (`insuredId`) REFERENCES `insureds`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_conversations_campaignId_notification_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `notification_campaigns`(`id`),
	CONSTRAINT "conversations_type_check" CHECK("type" IN ('reminder', 'renewal', 'inquiry', 'general')),
	CONSTRAINT "conversations_status_check" CHECK("status" IN ('open', 'pending', 'closed')),
	CONSTRAINT "conversations_metadata_json" CHECK(json_valid("metadata"))
);
--> statement-breakpoint
CREATE TABLE `conversation_participants` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`conversationId` text NOT NULL,
	`userId` text,
	`insuredId` text,
	`joinedAt` integer,
	CONSTRAINT `fk_conversation_participants_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_conversation_participants_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_conversation_participants_insuredId_insureds_id_fk` FOREIGN KEY (`insuredId`) REFERENCES `insureds`(`id`) ON DELETE CASCADE,
	CONSTRAINT "conversation_participants_user_insured_xor" CHECK(("userId" IS NOT NULL) + ("insuredId" IS NOT NULL) = 1)
);
--> statement-breakpoint
CREATE TABLE `conversation_entities` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`conversationId` text NOT NULL,
	`policyId` text,
	`insuredId` text,
	`installmentId` text,
	`linkedBy` text,
	`linkedAt` integer,
	CONSTRAINT `fk_conversation_entities_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_conversation_entities_policyId_policies_id_fk` FOREIGN KEY (`policyId`) REFERENCES `policies`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_conversation_entities_insuredId_insureds_id_fk` FOREIGN KEY (`insuredId`) REFERENCES `insureds`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_conversation_entities_installmentId_policy_installments_id_fk` FOREIGN KEY (`installmentId`) REFERENCES `policy_installments`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_conversation_entities_linkedBy_user_id_fk` FOREIGN KEY (`linkedBy`) REFERENCES `user`(`id`),
	CONSTRAINT "conversation_entities_policy_insured_installment_xor" CHECK(("policyId" IS NOT NULL) + ("insuredId" IS NOT NULL) + ("installmentId" IS NOT NULL) = 1)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`conversationId` text NOT NULL,
	`organizationId` text NOT NULL,
	`templateId` text,
	`direction` text NOT NULL,
	`senderKind` text NOT NULL,
	`senderUserId` text,
	`senderInsuredId` text,
	`content` text NOT NULL,
	`deduplicationHash` text,
	`sentAt` integer,
	`metadata` text,
	CONSTRAINT `fk_messages_organizationId_organization_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_messages_templateId_message_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `message_templates`(`id`),
	CONSTRAINT `fk_messages_senderUserId_user_id_fk` FOREIGN KEY (`senderUserId`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_messages_senderInsuredId_insureds_id_fk` FOREIGN KEY (`senderInsuredId`) REFERENCES `insureds`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_messages_conversationId_organizationId_conversations_id_organizationId_fk` FOREIGN KEY (`conversationId`,`organizationId`) REFERENCES `conversations`(`id`,`organizationId`),
	CONSTRAINT "messages_direction_check" CHECK("direction" IN ('inbound', 'outbound')),
	CONSTRAINT "messages_sender_kind_check" CHECK("senderKind" IN ('user', 'insured', 'system', 'agent')),
	CONSTRAINT "messages_metadata_json" CHECK(json_valid("metadata")),
	CONSTRAINT "messages_sender_kind_coherence" CHECK(CASE "senderKind"
        WHEN 'user' THEN ("senderUserId" IS NOT NULL) + ("senderInsuredId" IS NULL)
        WHEN 'insured' THEN ("senderInsuredId" IS NOT NULL) + ("senderUserId" IS NULL)
        WHEN 'system' THEN ("senderUserId" IS NULL) + ("senderInsuredId" IS NULL)
        WHEN 'agent' THEN ("senderUserId" IS NULL) + ("senderInsuredId" IS NULL)
      END = 1)
);
--> statement-breakpoint
CREATE TABLE `message_statuses` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`messageId` text NOT NULL,
	`status` text NOT NULL,
	`occurredAt` integer NOT NULL,
	`details` text,
	CONSTRAINT `fk_message_statuses_messageId_messages_id_fk` FOREIGN KEY (`messageId`) REFERENCES `messages`(`id`) ON DELETE CASCADE,
	CONSTRAINT "message_statuses_status_check" CHECK("status" IN ('sent', 'delivered', 'read', 'failed', 'received')),
	CONSTRAINT "message_statuses_details_json" CHECK(json_valid("details"))
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`code` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`code` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `asset_types` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`branchId` text,
	`code` text,
	`name` text,
	`propertyDefinition` text,
	CONSTRAINT `fk_asset_types_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL,
	CONSTRAINT "asset_types_property_definition_json" CHECK(json_valid("propertyDefinition"))
);
--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`code` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `insureds` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`organizationId` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`cuit` text NOT NULL,
	`fullName` text NOT NULL,
	`phone` text,
	`email` text,
	`birthDate` text,
	CONSTRAINT `fk_insureds_organizationId_organization_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_insureds_uploaded_by_user_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`insuredId` text NOT NULL,
	`assetTypeId` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`externalReference` text,
	`properties` text,
	CONSTRAINT `fk_assets_insuredId_insureds_id_fk` FOREIGN KEY (`insuredId`) REFERENCES `insureds`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_assets_assetTypeId_asset_types_id_fk` FOREIGN KEY (`assetTypeId`) REFERENCES `asset_types`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_assets_uploaded_by_user_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT,
	CONSTRAINT "assets_properties_json" CHECK(json_valid("properties"))
);
--> statement-breakpoint
CREATE TABLE `policies` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`organizationId` text NOT NULL,
	`companyId` text NOT NULL,
	`insuredId` text NOT NULL,
	`paymentMethodId` text,
	`uploaded_by` text NOT NULL,
	`producedBy` text,
	`policyNumber` text NOT NULL,
	`premiumTotal` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'ARS' NOT NULL,
	`startDate` text,
	`endDate` text,
	`effectiveEndDate` text,
	`status` text DEFAULT 'active' NOT NULL,
	`billingFrequency` text DEFAULT 'monthly' NOT NULL,
	`documentUrl` text,
	CONSTRAINT `fk_policies_organizationId_organization_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_policies_companyId_companies_id_fk` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_policies_insuredId_insureds_id_fk` FOREIGN KEY (`insuredId`) REFERENCES `insureds`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_policies_paymentMethodId_payment_methods_id_fk` FOREIGN KEY (`paymentMethodId`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_policies_uploaded_by_user_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_policies_producedBy_user_id_fk` FOREIGN KEY (`producedBy`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT "policies_status_check" CHECK("status" IN ('active', 'overdue', 'expired', 'renewed', 'canceled')),
	CONSTRAINT "policies_billing_frequency_check" CHECK("billingFrequency" IN ('monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual', 'single_payment'))
);
--> statement-breakpoint
CREATE TABLE `policy_assets` (
	`policyId` text NOT NULL,
	`assetId` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `policy_assets_pk` PRIMARY KEY(`policyId`, `assetId`),
	CONSTRAINT `fk_policy_assets_policyId_policies_id_fk` FOREIGN KEY (`policyId`) REFERENCES `policies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_policy_assets_assetId_assets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `policy_coverages` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`policyId` text NOT NULL,
	`data` text,
	CONSTRAINT `fk_policy_coverages_policyId_policies_id_fk` FOREIGN KEY (`policyId`) REFERENCES `policies`(`id`) ON DELETE CASCADE,
	CONSTRAINT "policy_coverages_data_json" CHECK(json_valid("data"))
);
--> statement-breakpoint
CREATE TABLE `policy_installments` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`organizationId` text NOT NULL,
	`policyId` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`installmentNumber` integer NOT NULL,
	`dueDate` text,
	`totalAmount` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'ARS' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`receiptUrl` text,
	CONSTRAINT `fk_policy_installments_organizationId_organization_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_policy_installments_policyId_policies_id_fk` FOREIGN KEY (`policyId`) REFERENCES `policies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_policy_installments_uploaded_by_user_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT,
	CONSTRAINT "policy_installments_status_check" CHECK("status" IN ('pending', 'paid', 'overdue'))
);
--> statement-breakpoint
CREATE TABLE `reminder_rules` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`organizationId` text NOT NULL,
	`eventSource` text NOT NULL,
	`offsetDays` integer NOT NULL,
	`templateId` text,
	`isEnabled` integer DEFAULT false NOT NULL,
	CONSTRAINT `fk_reminder_rules_organizationId_organization_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_reminder_rules_templateId_message_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `message_templates`(`id`) ON DELETE SET NULL,
	CONSTRAINT "reminder_rules_event_source_check" CHECK("eventSource" IN ('installment_due', 'policy_expiration'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_issuer_accountId_uidx` ON `account` (`issuer`,`account_id`);--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `invitation_organizationId_idx` ON `invitation` (`organization_id`);--> statement-breakpoint
CREATE INDEX `invitation_email_idx` ON `invitation` (`email`);--> statement-breakpoint
CREATE INDEX `member_organizationId_idx` ON `member` (`organization_id`);--> statement-breakpoint
CREATE INDEX `member_userId_idx` ON `member` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_slug_uidx` ON `organization` (`slug`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `ai_extraction_results_policy_id_idx` ON `ai_extraction_results` (`policyId`);--> statement-breakpoint
CREATE INDEX `ai_extraction_results_reviewed_by_idx` ON `ai_extraction_results` (`reviewedBy`);--> statement-breakpoint
CREATE UNIQUE INDEX `plans_code_uq` ON `plans` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `plan_versions_plan_version_uq` ON `plan_versions` (`planId`,`version`);--> statement-breakpoint
CREATE INDEX `plan_versions_plan_id_idx` ON `plan_versions` (`planId`);--> statement-breakpoint
CREATE UNIQUE INDEX `features_code_uq` ON `features` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_active_org_uq` ON `subscriptions` (`organizationId`) WHERE "subscriptions"."status" = 'active';--> statement-breakpoint
CREATE INDEX `subscriptions_organization_id_idx` ON `subscriptions` (`organizationId`);--> statement-breakpoint
CREATE INDEX `subscriptions_plan_version_id_idx` ON `subscriptions` (`planVersionId`);--> statement-breakpoint
CREATE INDEX `subscription_payments_organization_id_idx` ON `subscription_payments` (`organizationId`);--> statement-breakpoint
CREATE INDEX `subscription_payments_subscription_id_idx` ON `subscription_payments` (`subscriptionId`);--> statement-breakpoint
CREATE UNIQUE INDEX `channels_code_uq` ON `channels` (`code`);--> statement-breakpoint
CREATE INDEX `channel_endpoints_channel_id_idx` ON `channel_endpoints` (`channelId`);--> statement-breakpoint
CREATE INDEX `channel_endpoints_owner_organization_id_idx` ON `channel_endpoints` (`ownerOrganizationId`);--> statement-breakpoint
CREATE INDEX `organization_integrations_organization_id_idx` ON `organization_integrations` (`organizationId`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_channels_org_channel_uq` ON `organization_channels` (`organizationId`,`channelId`);--> statement-breakpoint
CREATE INDEX `organization_channels_integration_id_idx` ON `organization_channels` (`integrationId`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_channel_endpoints_org_channel_endpoint_uq` ON `organization_channel_endpoints` (`organizationChannelId`,`endpointId`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_channel_endpoints_primary_uq` ON `organization_channel_endpoints` (`organizationChannelId`) WHERE "organization_channel_endpoints"."isPrimary" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX `organization_channel_endpoints_endpoint_active_uq` ON `organization_channel_endpoints` (`endpointId`) WHERE "organization_channel_endpoints"."status" = 'active';--> statement-breakpoint
CREATE INDEX `organization_channel_endpoints_endpoint_id_idx` ON `organization_channel_endpoints` (`endpointId`);--> statement-breakpoint
CREATE INDEX `organization_channel_endpoints_org_channel_id_idx` ON `organization_channel_endpoints` (`organizationChannelId`);--> statement-breakpoint
CREATE UNIQUE INDEX `communication_categories_code_uq` ON `communication_categories` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `message_templates_code_uq` ON `message_templates` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `message_templates_id_channel_uq` ON `message_templates` (`id`,`channelId`);--> statement-breakpoint
CREATE INDEX `message_templates_channel_id_idx` ON `message_templates` (`channelId`);--> statement-breakpoint
CREATE INDEX `message_templates_category_id_idx` ON `message_templates` (`categoryId`);--> statement-breakpoint
CREATE INDEX `notification_campaigns_organization_id_idx` ON `notification_campaigns` (`organizationId`);--> statement-breakpoint
CREATE INDEX `system_notifications_org_status_idx` ON `system_notifications` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `system_notifications_template_channel_idx` ON `system_notifications` (`templateId`,`channelId`);--> statement-breakpoint
CREATE INDEX `system_notifications_campaign_id_idx` ON `system_notifications` (`campaignId`);--> statement-breakpoint
CREATE INDEX `system_notifications_recipient_user_id_idx` ON `system_notifications` (`recipientUserId`);--> statement-breakpoint
CREATE INDEX `system_notification_statuses_system_notification_id_idx` ON `system_notification_statuses` (`systemNotificationId`);--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_id_org_uq` ON `conversations` (`id`,`organizationId`);--> statement-breakpoint
CREATE INDEX `conversations_organization_id_idx` ON `conversations` (`organizationId`);--> statement-breakpoint
CREATE INDEX `conversations_insured_id_idx` ON `conversations` (`insuredId`);--> statement-breakpoint
CREATE INDEX `conversations_campaign_id_idx` ON `conversations` (`campaignId`);--> statement-breakpoint
CREATE INDEX `conversations_org_channel_endpoint_id_idx` ON `conversations` (`organizationChannelEndpointId`);--> statement-breakpoint
CREATE INDEX `conversation_participants_conversation_id_idx` ON `conversation_participants` (`conversationId`);--> statement-breakpoint
CREATE INDEX `conversation_participants_user_id_idx` ON `conversation_participants` (`userId`);--> statement-breakpoint
CREATE INDEX `conversation_participants_insured_id_idx` ON `conversation_participants` (`insuredId`);--> statement-breakpoint
CREATE INDEX `conversation_entities_conversation_id_idx` ON `conversation_entities` (`conversationId`);--> statement-breakpoint
CREATE INDEX `conversation_entities_policy_id_idx` ON `conversation_entities` (`policyId`);--> statement-breakpoint
CREATE INDEX `conversation_entities_insured_id_idx` ON `conversation_entities` (`insuredId`);--> statement-breakpoint
CREATE INDEX `conversation_entities_installment_id_idx` ON `conversation_entities` (`installmentId`);--> statement-breakpoint
CREATE INDEX `conversation_entities_linked_by_idx` ON `conversation_entities` (`linkedBy`);--> statement-breakpoint
CREATE UNIQUE INDEX `messages_org_dedup_uq` ON `messages` (`organizationId`,`deduplicationHash`);--> statement-breakpoint
CREATE INDEX `messages_conversation_sent_at_idx` ON `messages` (`conversationId`,`sentAt`);--> statement-breakpoint
CREATE INDEX `messages_template_id_idx` ON `messages` (`templateId`);--> statement-breakpoint
CREATE INDEX `messages_sender_user_id_idx` ON `messages` (`senderUserId`);--> statement-breakpoint
CREATE INDEX `messages_sender_insured_id_idx` ON `messages` (`senderInsuredId`);--> statement-breakpoint
CREATE INDEX `message_statuses_message_id_idx` ON `message_statuses` (`messageId`);--> statement-breakpoint
CREATE UNIQUE INDEX `companies_code_uq` ON `companies` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `branches_code_uq` ON `branches` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `asset_types_branch_code_uq` ON `asset_types` (`branchId`,`code`);--> statement-breakpoint
CREATE INDEX `asset_types_branch_id_idx` ON `asset_types` (`branchId`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_methods_code_uq` ON `payment_methods` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `insureds_organization_cuit_uq` ON `insureds` (`organizationId`,`cuit`);--> statement-breakpoint
CREATE INDEX `insureds_organization_id_idx` ON `insureds` (`organizationId`);--> statement-breakpoint
CREATE INDEX `insureds_uploaded_by_idx` ON `insureds` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `assets_insured_id_idx` ON `assets` (`insuredId`);--> statement-breakpoint
CREATE INDEX `assets_asset_type_id_idx` ON `assets` (`assetTypeId`);--> statement-breakpoint
CREATE INDEX `assets_uploaded_by_idx` ON `assets` (`uploaded_by`);--> statement-breakpoint
CREATE UNIQUE INDEX `policies_org_company_number_uq` ON `policies` (`organizationId`,`companyId`,`policyNumber`);--> statement-breakpoint
CREATE INDEX `policies_insured_id_idx` ON `policies` (`insuredId`);--> statement-breakpoint
CREATE INDEX `policies_company_id_idx` ON `policies` (`companyId`);--> statement-breakpoint
CREATE INDEX `policies_payment_method_id_idx` ON `policies` (`paymentMethodId`);--> statement-breakpoint
CREATE INDEX `policies_uploaded_by_idx` ON `policies` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `policies_produced_by_idx` ON `policies` (`producedBy`);--> statement-breakpoint
CREATE INDEX `policy_coverages_policy_id_idx` ON `policy_coverages` (`policyId`);--> statement-breakpoint
CREATE INDEX `policy_installments_policy_id_idx` ON `policy_installments` (`policyId`);--> statement-breakpoint
CREATE INDEX `policy_installments_status_idx` ON `policy_installments` (`status`);--> statement-breakpoint
CREATE INDEX `policy_installments_due_date_idx` ON `policy_installments` (`dueDate`);--> statement-breakpoint
CREATE INDEX `policy_installments_organization_id_idx` ON `policy_installments` (`organizationId`);--> statement-breakpoint
CREATE INDEX `policy_installments_uploaded_by_idx` ON `policy_installments` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `reminder_rules_organization_id_idx` ON `reminder_rules` (`organizationId`);--> statement-breakpoint
CREATE INDEX `reminder_rules_template_id_idx` ON `reminder_rules` (`templateId`);