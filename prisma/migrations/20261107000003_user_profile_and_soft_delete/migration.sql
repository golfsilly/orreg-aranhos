ALTER TABLE `User`
  ADD COLUMN `deletedAt` DATETIME(3) NULL,
  ADD COLUMN `organization` VARCHAR(191) NULL,
  ADD COLUMN `mission` VARCHAR(191) NULL,
  ADD COLUMN `workGroup` VARCHAR(191) NULL,
  ADD COLUMN `jobTitle` VARCHAR(191) NULL,
  ADD COLUMN `jobLevel` VARCHAR(191) NULL,
  ADD INDEX `User_deletedAt_name_id_idx` (`deletedAt`, `name`, `id`);
