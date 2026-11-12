CREATE TABLE `SurgeryNotificationDelivery` (
  `job` VARCHAR(64) NOT NULL,
  `operationId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(16) NOT NULL,
  `errorCode` VARCHAR(64) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `sentAt` DATETIME(3) NULL,
  PRIMARY KEY (`job`, `operationId`),
  INDEX `SurgeryNotificationDelivery_status_createdAt_idx` (`status`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;
