ALTER TABLE `records` ADD COLUMN `recordDate` timestamp NULL;
CREATE INDEX `records_user_record_date_idx` ON `records` (`userId`,`recordDate`);
