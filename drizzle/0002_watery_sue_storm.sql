CREATE TABLE `reviewNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviewNotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `review_notes_user_period_idx` UNIQUE(`userId`,`periodStart`)
);
--> statement-breakpoint
ALTER TABLE `reviewNotes` ADD CONSTRAINT `reviewNotes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;