ALTER TABLE `messages` ADD `wamid` text;--> statement-breakpoint
CREATE INDEX `messages_wamid_idx` ON `messages` (`wamid`);