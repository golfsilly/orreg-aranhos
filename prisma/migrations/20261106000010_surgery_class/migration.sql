-- AlterTable
ALTER TABLE `SurgeryRegister` ADD COLUMN `minorPeriod` ENUM('OFFICIAL_HOURS', 'OUTSIDE_HOURS') NULL,
    ADD COLUMN `surgeryClass` ENUM('MAJOR', 'MINOR') NULL;
