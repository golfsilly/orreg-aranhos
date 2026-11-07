ALTER TABLE `User` ADD COLUMN `username` VARCHAR(191) NULL, ADD COLUMN `cidSha256` CHAR(64) NULL;
CREATE UNIQUE INDEX `User_username_key` ON `User`(`username`);
CREATE UNIQUE INDEX `User_cidSha256_key` ON `User`(`cidSha256`);
CREATE UNIQUE INDEX `Account_providerId_accountId_key` ON `Account`(`providerId`, `accountId`);
