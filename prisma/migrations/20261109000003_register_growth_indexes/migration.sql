-- Speed up date-range reports over all departments and doctor case counts.
CREATE INDEX `SurgeryRegister_operationDate_id_idx`
  ON `SurgeryRegister` (`operationDate`, `id`);

CREATE INDEX `SurgeryRegisterStaff_positionId_registerId_idx`
  ON `SurgeryRegisterStaff` (`positionId`, `registerId`);
