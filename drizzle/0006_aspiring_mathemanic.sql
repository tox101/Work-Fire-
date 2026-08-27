ALTER TABLE `savedRecordSearches` ADD `sortOrder` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `saved_record_searches_user_sort_idx` ON `savedRecordSearches` (`userId`,`sortOrder`);