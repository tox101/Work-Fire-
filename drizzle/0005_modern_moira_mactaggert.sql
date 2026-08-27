CREATE TABLE `savedRecordSearches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`query` varchar(240),
	`projectId` int,
	`taskId` int,
	`sourceType` enum('capture','work_log','journal','link'),
	`period` enum('all','month') NOT NULL DEFAULT 'all',
	`sort` enum('newest','oldest','pinned') NOT NULL DEFAULT 'newest',
	`tag` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `savedRecordSearches_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_record_searches_user_name_idx` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `savedRecordSearches` ADD CONSTRAINT `savedRecordSearches_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `savedRecordSearches` ADD CONSTRAINT `savedRecordSearches_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `savedRecordSearches` ADD CONSTRAINT `savedRecordSearches_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `saved_record_searches_user_updated_idx` ON `savedRecordSearches` (`userId`,`updatedAt`);