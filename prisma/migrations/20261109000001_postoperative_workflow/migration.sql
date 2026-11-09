-- AlterTable
ALTER TABLE `PostoperativeObservation` ADD COLUMN `airwayStatus` VARCHAR(64) NULL,
    ADD COLUMN `vomiting` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `PostoperativeRecord` ADD COLUMN `airwayStable` BOOLEAN NULL,
    ADD COLUMN `consciousnessRecovered` BOOLEAN NULL,
    ADD COLUMN `dischargeAssessedAt` DATETIME(3) NULL,
    ADD COLUMN `dischargeAssessedById` VARCHAR(191) NULL,
    ADD COLUMN `handoffComplete` BOOLEAN NULL,
    ADD COLUMN `nauseaControlled` BOOLEAN NULL,
    ADD COLUMN `painControlled` BOOLEAN NULL,
    ADD COLUMN `vitalSignsStable` BOOLEAN NULL;

-- AlterTable
ALTER TABLE `PostoperativeSsiFollowup` ADD COLUMN `drainage` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `fever` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `increasingPain` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `infectionConfirmed` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `redness` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `ssiDepth` VARCHAR(32) NULL,
    ADD COLUMN `swelling` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `taskId` VARCHAR(191) NULL,
    ADD COLUMN `warmth` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `woundSeparation` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `PostoperativeTransfer` ADD COLUMN `sbarAssessment` TEXT NULL,
    ADD COLUMN `sbarBackground` TEXT NULL,
    ADD COLUMN `sbarRecommendation` TEXT NULL,
    ADD COLUMN `sbarSituation` TEXT NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `isPostopLead` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `PostoperativeVitalThreshold` (
    `id` VARCHAR(32) NOT NULL,
    `systolicMin` INTEGER NULL,
    `systolicMax` INTEGER NULL,
    `diastolicMin` INTEGER NULL,
    `diastolicMax` INTEGER NULL,
    `heartRateMin` INTEGER NULL,
    `heartRateMax` INTEGER NULL,
    `respiratoryMin` INTEGER NULL,
    `respiratoryMax` INTEGER NULL,
    `oxygenSaturationMin` INTEGER NULL,
    `temperatureMin` DOUBLE NULL,
    `temperatureMax` DOUBLE NULL,
    `painScoreMax` INTEGER NULL,
    `aldreteScoreMin` INTEGER NULL,
    `updatedById` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostoperativeSsiTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `scopeType` VARCHAR(32) NOT NULL,
    `scopeKey` VARCHAR(191) NOT NULL DEFAULT 'ALL',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `updatedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PostoperativeSsiTemplate_isActive_scopeType_idx`(`isActive`, `scopeType`),
    UNIQUE INDEX `PostoperativeSsiTemplate_scopeType_scopeKey_key`(`scopeType`, `scopeKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostoperativeSsiTemplateRound` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `roundNumber` INTEGER NOT NULL,
    `dayOffset` INTEGER NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PostoperativeSsiTemplateRound_templateId_dayOffset_idx`(`templateId`, `dayOffset`),
    UNIQUE INDEX `PostoperativeSsiTemplateRound_templateId_roundNumber_key`(`templateId`, `roundNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostoperativeFollowupTask` (
    `id` VARCHAR(191) NOT NULL,
    `registerId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `templateRoundId` VARCHAR(191) NOT NULL,
    `templateNameSnapshot` VARCHAR(191) NOT NULL,
    `roundLabel` VARCHAR(191) NOT NULL,
    `roundNumber` INTEGER NOT NULL,
    `dayOffset` INTEGER NOT NULL,
    `dueAt` DATE NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    `completedAt` DATETIME(3) NULL,
    `completedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PostoperativeFollowupTask_status_dueAt_id_idx`(`status`, `dueAt`, `id`),
    INDEX `PostoperativeFollowupTask_registerId_dueAt_idx`(`registerId`, `dueAt`),
    UNIQUE INDEX `PostoperativeFollowupTask_registerId_templateId_roundNumber_key`(`registerId`, `templateId`, `roundNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `PostoperativeSsiFollowup_taskId_key` ON `PostoperativeSsiFollowup`(`taskId`);

-- AddForeignKey
ALTER TABLE `PostoperativeSsiFollowup` ADD CONSTRAINT `PostoperativeSsiFollowup_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `PostoperativeFollowupTask`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostoperativeSsiTemplateRound` ADD CONSTRAINT `PostoperativeSsiTemplateRound_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `PostoperativeSsiTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostoperativeFollowupTask` ADD CONSTRAINT `PostoperativeFollowupTask_registerId_fkey` FOREIGN KEY (`registerId`) REFERENCES `SurgeryRegister`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostoperativeFollowupTask` ADD CONSTRAINT `PostoperativeFollowupTask_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `PostoperativeSsiTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostoperativeFollowupTask` ADD CONSTRAINT `PostoperativeFollowupTask_templateRoundId_fkey` FOREIGN KEY (`templateRoundId`) REFERENCES `PostoperativeSsiTemplateRound`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
