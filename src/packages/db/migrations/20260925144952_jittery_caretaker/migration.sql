PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_messages` (
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
        WHEN 'user' THEN ("senderUserId" IS NOT NULL) AND ("senderInsuredId" IS NULL)
        WHEN 'insured' THEN ("senderInsuredId" IS NOT NULL) AND ("senderUserId" IS NULL)
        WHEN 'system' THEN ("senderUserId" IS NULL) AND ("senderInsuredId" IS NULL)
        WHEN 'agent' THEN ("senderUserId" IS NULL) AND ("senderInsuredId" IS NULL)
      END = 1)
);
--> statement-breakpoint
INSERT INTO `__new_messages`(`id`, `created_at`, `updated_at`, `deleted_at`, `conversationId`, `organizationId`, `templateId`, `direction`, `senderKind`, `senderUserId`, `senderInsuredId`, `content`, `deduplicationHash`, `sentAt`, `metadata`) SELECT `id`, `created_at`, `updated_at`, `deleted_at`, `conversationId`, `organizationId`, `templateId`, `direction`, `senderKind`, `senderUserId`, `senderInsuredId`, `content`, `deduplicationHash`, `sentAt`, `metadata` FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `organization_channel_endpoints_endpoint_active_uq`;--> statement-breakpoint
CREATE UNIQUE INDEX `messages_org_dedup_uq` ON `messages` (`organizationId`,`deduplicationHash`);--> statement-breakpoint
CREATE INDEX `messages_conversation_sent_at_idx` ON `messages` (`conversationId`,`sentAt`);--> statement-breakpoint
CREATE INDEX `messages_template_id_idx` ON `messages` (`templateId`);--> statement-breakpoint
CREATE INDEX `messages_sender_user_id_idx` ON `messages` (`senderUserId`);--> statement-breakpoint
CREATE INDEX `messages_sender_insured_id_idx` ON `messages` (`senderInsuredId`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_channel_endpoints_active_uq` ON `organization_channel_endpoints` (`organizationChannelId`) WHERE "organization_channel_endpoints"."status" = 'active';