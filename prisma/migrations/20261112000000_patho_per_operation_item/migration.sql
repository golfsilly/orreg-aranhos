CREATE TABLE `SurgeryRegisterPathoItem` (
  `registerId` VARCHAR(191) NOT NULL,
  `operationDetailId` INT NOT NULL,
  `operationItemId` INT NULL,
  `operationItemName` VARCHAR(250) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`registerId`, `operationDetailId`),
  INDEX `SurgeryRegisterPathoItem_operationItemId_idx` (`operationItemId`),
  CONSTRAINT `SurgeryRegisterPathoItem_registerId_fkey`
    FOREIGN KEY (`registerId`) REFERENCES `SurgeryRegister` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;
