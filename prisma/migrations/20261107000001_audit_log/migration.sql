CREATE TABLE `AuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `actorId` VARCHAR(191) NULL,
  `event` VARCHAR(64) NOT NULL,
  `outcome` ENUM('SUCCESS', 'FAILURE', 'DENIED') NOT NULL,
  `targetType` VARCHAR(32) NULL,
  `targetId` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  INDEX `AuditLog_occurredAt_id_idx` (`occurredAt`, `id`),
  INDEX `AuditLog_actorId_occurredAt_idx` (`actorId`, `occurredAt`),
  INDEX `AuditLog_targetType_targetId_occurredAt_idx` (`targetType`, `targetId`, `occurredAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
