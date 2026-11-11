CREATE TABLE `SurgeryNotificationCursor` (
  `job` VARCHAR(64) NOT NULL,
  `requestAt` VARCHAR(19) NOT NULL,
  `operationId` VARCHAR(191) NOT NULL DEFAULT '0',
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`job`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;
