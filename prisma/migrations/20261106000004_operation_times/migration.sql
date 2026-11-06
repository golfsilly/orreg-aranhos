-- AlterTable
ALTER TABLE `SurgeryRegister` ADD COLUMN `operationEndedAt` DATETIME(3) NULL,
    ADD COLUMN `operationStartedAt` DATETIME(3) NULL,
    ADD COLUMN `roomEnteredAt` DATETIME(3) NULL,
    ADD COLUMN `roomExitedAt` DATETIME(3) NULL;
