-- CreateTable
CREATE TABLE `SurgeryRegisterCounter` (
    `fiscalYear` INTEGER NOT NULL,
    `calendarMonth` INTEGER NOT NULL,
    `lastSequence` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`fiscalYear`, `calendarMonth`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurgeryRegister` (
    `id` VARCHAR(191) NOT NULL,
    `fiscalYear` INTEGER NOT NULL,
    `calendarMonth` INTEGER NOT NULL,
    `sequence` INTEGER NOT NULL,
    `operationDate` DATE NOT NULL,
    `hosxpOperationId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SurgeryRegister_hosxpOperationId_idx`(`hosxpOperationId`),
    INDEX `SurgeryRegister_createdById_idx`(`createdById`),
    UNIQUE INDEX `SurgeryRegister_fiscalYear_calendarMonth_sequence_key`(`fiscalYear`, `calendarMonth`, `sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurgeryRegisterStaff` (
    `id` VARCHAR(191) NOT NULL,
    `registerId` VARCHAR(191) NOT NULL,
    `positionId` INTEGER NOT NULL,
    `personnelGroup` INTEGER NOT NULL,
    `staffName` VARCHAR(191) NOT NULL,
    `hosxpStaffCode` VARCHAR(191) NULL,

    INDEX `SurgeryRegisterStaff_registerId_idx`(`registerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SurgeryRegister` ADD CONSTRAINT `SurgeryRegister_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurgeryRegisterStaff` ADD CONSTRAINT `SurgeryRegisterStaff_registerId_fkey` FOREIGN KEY (`registerId`) REFERENCES `SurgeryRegister`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
