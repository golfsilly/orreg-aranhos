ALTER TABLE `SurgeryRegisterCounter`
  ADD COLUMN `departmentId` VARCHAR(191) NOT NULL DEFAULT 'UNSPECIFIED',
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (`fiscalYear`, `calendarMonth`, `departmentId`);

ALTER TABLE `SurgeryRegister`
  ADD COLUMN `departmentId` VARCHAR(191) NOT NULL DEFAULT 'UNSPECIFIED',
  DROP INDEX `SurgeryRegister_fiscalYear_calendarMonth_sequence_key`,
  ADD UNIQUE INDEX `SurgeryRegister_period_department_sequence_key` (`fiscalYear`, `calendarMonth`, `departmentId`, `sequence`),
  ADD INDEX `SurgeryRegister_departmentId_operationDate_idx` (`departmentId`, `operationDate`);
