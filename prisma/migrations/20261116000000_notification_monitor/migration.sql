ALTER TABLE `SurgeryNotificationCursor`
  ADD COLUMN `lastCheckedAt` DATETIME(3) NULL,
  ADD COLUMN `lastCheckErrorCode` VARCHAR(64) NULL;

CREATE INDEX `SurgeryNotificationDelivery_job_createdAt_idx`
  ON `SurgeryNotificationDelivery` (`job`, `createdAt`);
CREATE INDEX `SurgeryNotificationDelivery_job_sentAt_idx`
  ON `SurgeryNotificationDelivery` (`job`, `sentAt`);
