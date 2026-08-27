CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recordId` int NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`url` varchar(700) NOT NULL,
	`fileName` varchar(320) NOT NULL,
	`mimeType` varchar(180) NOT NULL,
	`size` int NOT NULL,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `histories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityType` enum('Project','Stage','Task','Schedule','Record','Attachment') NOT NULL,
	`entityId` int NOT NULL,
	`taskId` int,
	`eventType` enum('created','updated','started','completed','on_hold','archived','linked') NOT NULL,
	`beforeData` json,
	`afterData` json,
	`note` text,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `histories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text,
	`color` varchar(24) NOT NULL DEFAULT '#141414',
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`sortOrder` int NOT NULL DEFAULT 0,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`stageId` int,
	`taskId` int,
	`scheduleId` int,
	`content` text NOT NULL,
	`sourceType` enum('capture','work_log','journal','link') NOT NULL DEFAULT 'capture',
	`recordKind` enum('captured','linked','classified') NOT NULL DEFAULT 'captured',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskId` int,
	`title` varchar(220) NOT NULL,
	`plannedStartAt` timestamp,
	`plannedEndAt` timestamp,
	`status` enum('planned','in_progress','completed','cancelled') NOT NULL DEFAULT 'planned',
	`actualStartedAt` timestamp,
	`actualCompletedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`status` enum('active','done','archived') NOT NULL DEFAULT 'active',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`stageId` int,
	`title` varchar(220) NOT NULL,
	`detail` text,
	`nextAction` varchar(320),
	`status` enum('inbox','planned','in_progress','done','on_hold','cancelled') NOT NULL DEFAULT 'inbox',
	`priority` enum('low','normal','high') NOT NULL DEFAULT 'normal',
	`sortOrder` int NOT NULL DEFAULT 0,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_recordId_records_id_fk` FOREIGN KEY (`recordId`) REFERENCES `records`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `histories` ADD CONSTRAINT `histories_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `histories` ADD CONSTRAINT `histories_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `records` ADD CONSTRAINT `records_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `records` ADD CONSTRAINT `records_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `records` ADD CONSTRAINT `records_stageId_stages_id_fk` FOREIGN KEY (`stageId`) REFERENCES `stages`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `records` ADD CONSTRAINT `records_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `records` ADD CONSTRAINT `records_scheduleId_schedules_id_fk` FOREIGN KEY (`scheduleId`) REFERENCES `schedules`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stages` ADD CONSTRAINT `stages_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stages` ADD CONSTRAINT `stages_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_stageId_stages_id_fk` FOREIGN KEY (`stageId`) REFERENCES `stages`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attachments_user_record_idx` ON `attachments` (`userId`,`recordId`);--> statement-breakpoint
CREATE INDEX `histories_user_entity_idx` ON `histories` (`userId`,`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `histories_user_task_occurred_idx` ON `histories` (`userId`,`taskId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `projects_user_status_idx` ON `projects` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `records_user_created_idx` ON `records` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `records_user_task_created_idx` ON `records` (`userId`,`taskId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `schedules_user_planned_idx` ON `schedules` (`userId`,`plannedStartAt`);--> statement-breakpoint
CREATE INDEX `schedules_user_task_idx` ON `schedules` (`userId`,`taskId`);--> statement-breakpoint
CREATE INDEX `stages_user_project_idx` ON `stages` (`userId`,`projectId`);--> statement-breakpoint
CREATE INDEX `tasks_user_status_updated_idx` ON `tasks` (`userId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `tasks_user_project_idx` ON `tasks` (`userId`,`projectId`);--> statement-breakpoint
CREATE INDEX `tasks_user_stage_idx` ON `tasks` (`userId`,`stageId`);