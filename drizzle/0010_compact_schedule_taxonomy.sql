ALTER TABLE `schedules`
  ADD `scheduleType` enum('task','meeting','personal','review') NOT NULL DEFAULT 'task' AFTER `title`,
  ADD `scheduleFlags` json NULL AFTER `scheduleType`;
--> statement-breakpoint
UPDATE `schedules` SET `scheduleType` = CASE
  WHEN JSON_UNQUOTE(JSON_EXTRACT(`notes`, '$.category')) = 'daily' THEN 'personal'
  ELSE 'task'
END,
`scheduleFlags` = CASE
  WHEN JSON_UNQUOTE(JSON_EXTRACT(`notes`, '$.category')) = 'urgent' THEN JSON_ARRAY('urgent')
  ELSE JSON_ARRAY()
END;
--> statement-breakpoint
ALTER TABLE `schedules` MODIFY `scheduleFlags` json NOT NULL;
--> statement-breakpoint
CREATE TABLE `scheduleTags` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `scheduleId` int NOT NULL,
  `tag` varchar(64) NOT NULL,
  `source` enum('user','rule','ai') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `scheduleTags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `scheduleTags` ADD CONSTRAINT `scheduleTags_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `scheduleTags` ADD CONSTRAINT `scheduleTags_scheduleId_schedules_id_fk` FOREIGN KEY (`scheduleId`) REFERENCES `schedules`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX `schedule_tags_user_schedule_tag_idx` ON `scheduleTags` (`userId`,`scheduleId`,`tag`);
--> statement-breakpoint
CREATE INDEX `schedule_tags_user_tag_schedule_idx` ON `scheduleTags` (`userId`,`tag`,`scheduleId`);
