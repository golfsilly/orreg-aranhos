CREATE TABLE `PostoperativeRecord` (
  `id` VARCHAR(191) NOT NULL,
  `registerId` VARCHAR(191) NOT NULL,
  `pacuArrivedAt` DATETIME(3) NULL,
  `pacuDischargedAt` DATETIME(3) NULL,
  `disposition` VARCHAR(32) NULL,
  `handoffNote` TEXT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `updatedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PostoperativeRecord_registerId_key` (`registerId`),
  INDEX `PostoperativeRecord_pacuArrivedAt_idx` (`pacuArrivedAt`),
  INDEX `PostoperativeRecord_disposition_updatedAt_idx` (`disposition`, `updatedAt`),
  CONSTRAINT `PostoperativeRecord_registerId_fkey` FOREIGN KEY (`registerId`) REFERENCES `SurgeryRegister` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `PostoperativeObservation` (
  `id` VARCHAR(191) NOT NULL,
  `recordId` VARCHAR(191) NOT NULL,
  `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `phase` VARCHAR(32) NOT NULL,
  `systolicBp` INTEGER NULL,
  `diastolicBp` INTEGER NULL,
  `heartRate` INTEGER NULL,
  `respiratoryRate` INTEGER NULL,
  `oxygenSaturation` INTEGER NULL,
  `temperatureC` DOUBLE NULL,
  `painScore` INTEGER NULL,
  `aldreteScore` INTEGER NULL,
  `oxygenSupport` VARCHAR(64) NULL,
  `consciousness` VARCHAR(64) NULL,
  `nausea` BOOLEAN NOT NULL DEFAULT false,
  `note` TEXT NULL,
  `recordedById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `PostoperativeObservation_recordId_recordedAt_idx` (`recordId`, `recordedAt`),
  CONSTRAINT `PostoperativeObservation_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `PostoperativeRecord` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `PostoperativeComplication` (
  `id` VARCHAR(191) NOT NULL,
  `recordId` VARCHAR(191) NOT NULL,
  `category` VARCHAR(64) NOT NULL,
  `severity` VARCHAR(24) NOT NULL,
  `occurredAt` DATETIME(3) NOT NULL,
  `intervention` TEXT NULL,
  `outcome` TEXT NULL,
  `resolvedAt` DATETIME(3) NULL,
  `recordedById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `PostoperativeComplication_recordId_occurredAt_idx` (`recordId`, `occurredAt`),
  INDEX `PostoperativeComplication_severity_occurredAt_idx` (`severity`, `occurredAt`),
  CONSTRAINT `PostoperativeComplication_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `PostoperativeRecord` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `PostoperativeTransfer` (
  `id` VARCHAR(191) NOT NULL,
  `recordId` VARCHAR(191) NOT NULL,
  `transferredAt` DATETIME(3) NOT NULL,
  `fromLocation` VARCHAR(191) NULL,
  `toLocation` VARCHAR(191) NOT NULL,
  `transportedBy` VARCHAR(191) NULL,
  `receivedBy` VARCHAR(191) NULL,
  `handoffNote` TEXT NULL,
  `recordedById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `PostoperativeTransfer_recordId_transferredAt_idx` (`recordId`, `transferredAt`),
  INDEX `PostoperativeTransfer_toLocation_transferredAt_idx` (`toLocation`, `transferredAt`),
  CONSTRAINT `PostoperativeTransfer_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `PostoperativeRecord` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `PostoperativeSsiFollowup` (
  `id` VARCHAR(191) NOT NULL,
  `recordId` VARCHAR(191) NOT NULL,
  `followedUpAt` DATETIME(3) NOT NULL,
  `postoperativeDay` INTEGER NULL,
  `woundStatus` VARCHAR(32) NOT NULL,
  `infectionSuspected` BOOLEAN NOT NULL DEFAULT false,
  `cultureResult` TEXT NULL,
  `treatment` TEXT NULL,
  `outcome` TEXT NULL,
  `nextFollowupAt` DATETIME(3) NULL,
  `recordedById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `PostoperativeSsiFollowup_recordId_followedUpAt_idx` (`recordId`, `followedUpAt`),
  INDEX `PostoperativeSsiFollowup_infectionSuspected_followedUpAt_idx` (`infectionSuspected`, `followedUpAt`),
  CONSTRAINT `PostoperativeSsiFollowup_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `PostoperativeRecord` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `SurgicalInstrument` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `category` VARCHAR(64) NOT NULL,
  `description` TEXT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `SurgicalInstrument_code_key` (`code`),
  INDEX `SurgicalInstrument_category_isActive_name_idx` (`category`, `isActive`, `name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `SurgicalInstrumentSet` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `SurgicalInstrumentSet_code_key` (`code`),
  INDEX `SurgicalInstrumentSet_isActive_name_idx` (`isActive`, `name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `SurgicalInstrumentSetItem` (
  `id` VARCHAR(191) NOT NULL,
  `setId` VARCHAR(191) NOT NULL,
  `instrumentId` VARCHAR(191) NOT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `SurgicalInstrumentSetItem_setId_instrumentId_key` (`setId`, `instrumentId`),
  INDEX `SurgicalInstrumentSetItem_instrumentId_idx` (`instrumentId`),
  CONSTRAINT `SurgicalInstrumentSetItem_setId_fkey` FOREIGN KEY (`setId`) REFERENCES `SurgicalInstrumentSet` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SurgicalInstrumentSetItem_instrumentId_fkey` FOREIGN KEY (`instrumentId`) REFERENCES `SurgicalInstrument` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `SurgeryInstrumentSetUse` (
  `id` VARCHAR(191) NOT NULL,
  `registerId` VARCHAR(191) NOT NULL,
  `setId` VARCHAR(191) NOT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `status` VARCHAR(24) NOT NULL DEFAULT 'ISSUED',
  `issuedAt` DATETIME(3) NULL,
  `returnedAt` DATETIME(3) NULL,
  `note` TEXT NULL,
  `recordedById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `SurgeryInstrumentSetUse_registerId_createdAt_idx` (`registerId`, `createdAt`),
  INDEX `SurgeryInstrumentSetUse_setId_status_idx` (`setId`, `status`),
  CONSTRAINT `SurgeryInstrumentSetUse_registerId_fkey` FOREIGN KEY (`registerId`) REFERENCES `SurgeryRegister` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SurgeryInstrumentSetUse_setId_fkey` FOREIGN KEY (`setId`) REFERENCES `SurgicalInstrumentSet` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `SurgicalImplant` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `manufacturer` VARCHAR(191) NULL,
  `model` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `SurgicalImplant_code_key` (`code`),
  INDEX `SurgicalImplant_isActive_name_idx` (`isActive`, `name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `SurgeryImplantRecord` (
  `id` VARCHAR(191) NOT NULL,
  `registerId` VARCHAR(191) NOT NULL,
  `implantId` VARCHAR(191) NOT NULL,
  `lotNumber` VARCHAR(100) NULL,
  `serialNumber` VARCHAR(100) NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `unit` VARCHAR(32) NULL,
  `site` VARCHAR(191) NULL,
  `laterality` VARCHAR(16) NULL,
  `expiresAt` DATE NULL,
  `recordedById` VARCHAR(191) NOT NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `SurgeryImplantRecord_registerId_createdAt_idx` (`registerId`, `createdAt`),
  INDEX `SurgeryImplantRecord_implantId_lotNumber_idx` (`implantId`, `lotNumber`),
  INDEX `SurgeryImplantRecord_serialNumber_idx` (`serialNumber`),
  CONSTRAINT `SurgeryImplantRecord_registerId_fkey` FOREIGN KEY (`registerId`) REFERENCES `SurgeryRegister` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SurgeryImplantRecord_implantId_fkey` FOREIGN KEY (`implantId`) REFERENCES `SurgicalImplant` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `SurgeryInstrumentCount` (
  `id` VARCHAR(191) NOT NULL,
  `registerId` VARCHAR(191) NOT NULL,
  `instrumentId` VARCHAR(191) NULL,
  `checkpoint` VARCHAR(32) NOT NULL,
  `category` VARCHAR(32) NOT NULL,
  `itemLabel` VARCHAR(191) NOT NULL,
  `expectedQuantity` INTEGER NOT NULL,
  `countedQuantity` INTEGER NOT NULL,
  `variance` INTEGER NOT NULL,
  `discrepancyNote` TEXT NULL,
  `resolvedAt` DATETIME(3) NULL,
  `countedById` VARCHAR(191) NOT NULL,
  `witnessName` VARCHAR(191) NULL,
  `countedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `SurgeryInstrumentCount_registerId_countedAt_idx` (`registerId`, `countedAt`),
  INDEX `SurgeryInstrumentCount_registerId_checkpoint_category_idx` (`registerId`, `checkpoint`, `category`),
  CONSTRAINT `SurgeryInstrumentCount_registerId_fkey` FOREIGN KEY (`registerId`) REFERENCES `SurgeryRegister` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SurgeryInstrumentCount_instrumentId_fkey` FOREIGN KEY (`instrumentId`) REFERENCES `SurgicalInstrument` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;
