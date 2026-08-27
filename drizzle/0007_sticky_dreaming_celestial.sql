ALTER TABLE `projects` ADD `revision` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `records` ADD `clientRequestId` varchar(80);--> statement-breakpoint
ALTER TABLE `schedules` ADD `revision` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `stages` ADD `revision` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `revision` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `attachments` ADD `clientUploadId` varchar(80);--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_user_client_upload_idx` UNIQUE(`userId`,`clientUploadId`);--> statement-breakpoint
ALTER TABLE `records` ADD CONSTRAINT `records_user_client_request_idx` UNIQUE(`userId`,`clientRequestId`);
