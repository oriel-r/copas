PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_message_statuses` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`messageId` text NOT NULL,
	`status` text NOT NULL,
	`occurredAt` integer NOT NULL,
	`details` text,
	CONSTRAINT `fk_message_statuses_messageId_messages_id_fk` FOREIGN KEY (`messageId`) REFERENCES `messages`(`id`) ON DELETE CASCADE,
	CONSTRAINT "message_statuses_status_check" CHECK("status" IN ('sent', 'delivered', 'read', 'failed', 'received', 'skipped')),
	CONSTRAINT "message_statuses_details_json" CHECK(json_valid("details"))
);
--> statement-breakpoint
INSERT INTO `__new_message_statuses`(`id`, `created_at`, `messageId`, `status`, `occurredAt`, `details`) SELECT `id`, `created_at`, `messageId`, `status`, `occurredAt`, `details` FROM `message_statuses`;--> statement-breakpoint
DROP TABLE `message_statuses`;--> statement-breakpoint
ALTER TABLE `__new_message_statuses` RENAME TO `message_statuses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `message_statuses_message_id_idx` ON `message_statuses` (`messageId`);--> statement-breakpoint
CREATE VIEW `v_due_installments` AS select "policy_installments"."id", "policy_installments"."organizationId", "policy_installments"."policyId", "policy_installments"."installmentNumber", "policy_installments"."dueDate", "policy_installments"."totalAmount", "policy_installments"."currency", "policy_installments"."status", "policy_installments"."receiptUrl", "policies"."policyNumber", "policies"."status", "policies"."startDate", "policies"."endDate", "policies"."effectiveEndDate", "policies"."companyId", "companies"."name", "companies"."code", "insureds"."id", "insureds"."fullName", "insureds"."phone", "insureds"."email", "insureds"."cuit" from "policy_installments" inner join "policies" on "policies"."id" = "policy_installments"."policyId" inner join "insureds" on "insureds"."id" = "policies"."insuredId" inner join "companies" on "companies"."id" = "policies"."companyId" where ((("policy_installments"."deleted_at" is null)) and (("policies"."deleted_at" is null)) and (("insureds"."deleted_at" is null)) and (("companies"."deleted_at" is null)));--> statement-breakpoint
CREATE VIEW `v_expiring_policies` AS select "policies"."id", "policies"."organizationId", "policies"."policyNumber", "policies"."status", "policies"."startDate", "policies"."endDate", "policies"."effectiveEndDate", COALESCE("policies"."effectiveEndDate", "policies"."endDate") as "expiration_date", "policies"."companyId", "companies"."name", "companies"."code", "insureds"."id", "insureds"."fullName", "insureds"."phone", "insureds"."email", "insureds"."cuit" from "policies" inner join "insureds" on "insureds"."id" = "policies"."insuredId" inner join "companies" on "companies"."id" = "policies"."companyId" where ((("policies"."deleted_at" is null)) and (("insureds"."deleted_at" is null)) and (("companies"."deleted_at" is null)));--> statement-breakpoint
CREATE VIEW `v_active_consents` AS select "communication_consents"."organizationId", "communication_consents"."insuredId", "communication_consents"."categoryId", "communication_categories"."code", "communication_categories"."name", "communication_consents"."isOptedOut", "communication_consents"."optOutAt", "communication_consents"."optOutReason" from "communication_consents" inner join "communication_categories" on "communication_categories"."id" = "communication_consents"."categoryId" where ((("communication_consents"."deleted_at" is null)) and (("communication_categories"."deleted_at" is null)));