import test from "node:test";
import assert from "node:assert/strict";
import { AUDIT_CLEANUP_MAX_BATCHES, pruneExpiredAuditLogs } from "../lib/audit/retention.ts";

test("prunes only expired central audit rows in bounded batches", async () => {
  const counts = [1000, 2];
  const queries = [];
  const result = await pruneExpiredAuditLogs({ $executeRaw: async (query, ...values) => {
    queries.push({ sql: query.join("?"), values });
    return counts.shift();
  } });
  assert.deepEqual(result, { deleted: 1002, mayHaveMore: false });
  assert.equal(queries.length, 2);
  for (const { sql, values } of queries) {
    assert.match(sql, /^DELETE FROM `AuditLog` WHERE `occurredAt` < DATE_SUB\(NOW\(3\), INTERVAL 30 DAY\).* LIMIT 1000$/);
    assert.deepEqual(values, []);
  }
});

test("limits each cleanup run and retries later if more may remain", async () => {
  let calls = 0;
  const result = await pruneExpiredAuditLogs({ $executeRaw: async () => { calls++; return 1000; } });
  assert.equal(calls, AUDIT_CLEANUP_MAX_BATCHES);
  assert.deepEqual(result, { deleted: 20_000, mayHaveMore: true });
});

test("propagates cleanup errors so the scheduler can retry", async () => {
  await assert.rejects(pruneExpiredAuditLogs({ $executeRaw: async () => { throw new Error("database unavailable"); } }), /database unavailable/);
});
