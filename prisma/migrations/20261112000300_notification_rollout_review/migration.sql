-- Existing cursors predate the delivery ledger. Their last attempt may already
-- have reached MOPH despite a response parsing failure. Require reconciliation
-- before enabling the upgraded sender; a new installation has no cursor yet.
UPDATE `SurgeryNotificationCursor`
SET `paused` = true,
    `lastErrorCode` = COALESCE(`lastErrorCode`, 'DELIVERY_GUARD_REVIEW')
WHERE `job` = 'SET_OR_NEW_OPERATION'
  AND NOT EXISTS (
    SELECT 1 FROM `SurgeryNotificationDelivery`
    WHERE `job` = 'SET_OR_NEW_OPERATION'
  );
