ALTER TABLE `SurgeryNotificationCursor`
  ADD COLUMN `paused` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `lastErrorCode` VARCHAR(64) NULL;

UPDATE `SurgeryNotificationCursor` AS cursor
SET `paused` = true,
    `lastErrorCode` = 'LEGACY_FAILURE_REVIEW'
WHERE cursor.`job` = 'SET_OR_NEW_OPERATION'
  AND EXISTS (
    SELECT 1
    FROM `AuditLog` AS latest_failure
    WHERE latest_failure.`event` = 'HOSXP_SET_OR_NOTIFICATION_SENT'
      AND latest_failure.`outcome` = 'FAILURE'
      AND latest_failure.`occurredAt` = (
        SELECT MAX(audit_row.`occurredAt`)
        FROM `AuditLog` AS audit_row
        WHERE audit_row.`event` = 'HOSXP_SET_OR_NOTIFICATION_SENT'
      )
  );
