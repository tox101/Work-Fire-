ALTER TABLE `records` ADD `isPinned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `records_user_pinned_created_idx` ON `records` (`userId`,`isPinned`,`createdAt`);