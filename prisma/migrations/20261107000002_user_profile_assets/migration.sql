CREATE TABLE `UserProfileAssets` (
    `userId` VARCHAR(191) NOT NULL,
    `avatar` MEDIUMBLOB NULL,
    `signature` MEDIUMBLOB NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`userId`),
    CONSTRAINT `UserProfileAssets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
