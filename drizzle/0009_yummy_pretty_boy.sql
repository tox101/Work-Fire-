CREATE TABLE `tagMergeOperations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceTag` varchar(64) NOT NULL,
	`targetTag` varchar(64) NOT NULL,
	`recordChanges` json NOT NULL,
	`savedSearchIds` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`undoneAt` timestamp,
	CONSTRAINT `tagMergeOperations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tagMergeOperations` ADD CONSTRAINT `tagMergeOperations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tag_merge_operations_user_created_idx` ON `tagMergeOperations` (`userId`,`createdAt`);