-- AlterTable
ALTER TABLE `SurgeryRegister` ADD COLUMN `anesthesia` ENUM('LA', 'TIVA', 'SB', 'NB', 'LMA', 'GA', 'GA_WITH_MASK') NULL,
    ADD COLUMN `patho` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `postOp` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `preOp` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `urgency` ENUM('ELECTIVE', 'EMERGENCY') NULL;

-- CreateTable
CREATE TABLE `SurgeryRegisterDetailChange` (
    `id` VARCHAR(191) NOT NULL,
    `registerId` VARCHAR(191) NOT NULL,
    `changedById` VARCHAR(191) NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `before` JSON NOT NULL,
    `after` JSON NOT NULL,

    INDEX `SurgeryRegisterDetailChange_registerId_changedAt_idx`(`registerId`, `changedAt`),
    INDEX `SurgeryRegisterDetailChange_changedById_idx`(`changedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SurgeryRegisterDetailChange` ADD CONSTRAINT `SurgeryRegisterDetailChange_registerId_fkey` FOREIGN KEY (`registerId`) REFERENCES `SurgeryRegister`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurgeryRegisterDetailChange` ADD CONSTRAINT `SurgeryRegisterDetailChange_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
