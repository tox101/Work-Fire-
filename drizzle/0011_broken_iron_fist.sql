CREATE TABLE `scheduleTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scheduleId` int NOT NULL,
	`tag` varchar(64) NOT NULL,
	`source` enum('user','rule','ai') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduleTags_id` PRIMARY KEY(`id`),
	CONSTRAINT `schedule_tags_user_schedule_tag_idx` UNIQUE(`userId`,`scheduleId`,`tag`)
);
--> statement-breakpoint
ALTER TABLE `schedules` ADD `scheduleType` enum('task','meeting','personal','review') DEFAULT 'task' NOT NULL;--> statement-breakpoint
ALTER TABLE `schedules` ADD `scheduleFlags` json NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduleTags` ADD CONSTRAINT `scheduleTags_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scheduleTags` ADD CONSTRAINT `scheduleTags_scheduleId_schedules_id_fk` FOREIGN KEY (`scheduleId`) REFERENCES `schedules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `schedule_tags_user_tag_schedule_idx` ON `scheduleTags` (`userId`,`tag`,`scheduleId`);