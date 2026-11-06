-- CreateTable
CREATE TABLE `SurgeryRegisterTimeChange` (
    `id` VARCHAR(191) NOT NULL,
    `registerId` VARCHAR(191) NOT NULL,
    `changedById` VARCHAR(191) NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `before` JSON NOT NULL,
    `after` JSON NOT NULL,

    INDEX `SurgeryRegisterTimeChange_registerId_changedAt_idx`(`registerId`, `changedAt`),
    INDEX `SurgeryRegisterTimeChange_changedById_idx`(`changedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SurgeryRegisterTimeChange` ADD CONSTRAINT `SurgeryRegisterTimeChange_registerId_fkey` FOREIGN KEY (`registerId`) REFERENCES `SurgeryRegister`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurgeryRegisterTimeChange` ADD CONSTRAINT `SurgeryRegisterTimeChange_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
