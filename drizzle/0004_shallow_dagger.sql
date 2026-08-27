CREATE TABLE `recordTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recordId` int NOT NULL,
	`tag` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recordTags_id` PRIMARY KEY(`id`),
	CONSTRAINT `record_tags_user_record_tag_idx` UNIQUE(`userId`,`recordId`,`tag`)
);
--> statement-breakpoint
ALTER TABLE `recordTags` ADD CONSTRAINT `recordTags_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recordTags` ADD CONSTRAINT `recordTags_recordId_records_id_fk` FOREIGN KEY (`recordId`) REFERENCES `records`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `record_tags_user_tag_record_idx` ON `recordTags` (`userId`,`tag`,`recordId`);