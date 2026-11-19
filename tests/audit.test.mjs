import assert from "node:assert/strict";
import { test } from "node:test";
import { writeAudit } from "../lib/audit/write.ts";

test("audit writer accepts only allowlisted metadata and never stores credentials", async () => {
  const writes = [];
  const db = { auditLog: { create: async (input) => writes.push(input.data) } };
  await writeAudit(db, { actorId: "user-test", event: "USER_UPDATED", outcome: "SUCCESS", targetType: "USER", targetId: "target-test", metadata: { previousRole: "USER", role: "NURSE", passwordChanged: true } });
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].metadata, { previousRole: "USER", role: "NURSE", passwordChanged: true });
  for (const key of ["password", "token", "cid", "hn", "patientName", "email"]) {
    await assert.rejects(() => writeAudit(db, { event: "USER_UPDATED", outcome: "SUCCESS", metadata: { [key]: "sensitive-value" } }));
  }
  await assert.rejects(() => writeAudit(db, { event: "UNKNOWN_EVENT", outcome: "SUCCESS" }));
  assert.equal(writes.length, 1);
});

test("skipped non-IPD notifications have a distinct allowlisted event with counts only", async () => {
  const writes = [];
  const db = { auditLog: { create: async (input) => writes.push(input.data) } };
  await writeAudit(db, {
    event: "HOSXP_SET_OR_NOTIFICATION_SKIPPED", outcome: "SUCCESS",
    metadata: { total: 100, section: "NOTIFICATION" },
  });
  assert.equal(writes[0].event, "HOSXP_SET_OR_NOTIFICATION_SKIPPED");
  assert.deepEqual(writes[0].metadata, { total: 100, section: "NOTIFICATION" });
  await assert.rejects(() => writeAudit(db, {
    event: "HOSXP_SET_OR_NOTIFICATION_SKIPPED", outcome: "SUCCESS",
    metadata: { total: 1, section: "NOTIFICATION", patientName: "DEMO-PATIENT" },
  }));
  assert.equal(writes.length, 1);
});
