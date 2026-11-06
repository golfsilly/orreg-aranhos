-- DropIndex
DROP INDEX `SurgeryRegister_hosxpOperationId_idx` ON `SurgeryRegister`;

-- CreateIndex
CREATE UNIQUE INDEX `SurgeryRegister_hosxpOperationId_key` ON `SurgeryRegister`(`hosxpOperationId`);
