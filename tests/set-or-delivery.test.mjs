import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const compiled = ts.transpileModule(readFileSync(new URL("../lib/notifications/set-or-scheduler.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadScheduler(mocks) {
  const mod = { exports: {} };
  new Function("require", "module", "exports", compiled)((id) => {
    if (!(id in mocks)) throw new Error(`Unexpected module ${id}`); return mocks[id];
  }, mod, mod.exports);
  return mod.exports;
}

function fixture() {
  let cursor = { operationId: "10", requestAt: "2026-11-12 10:00:00", paused: false };
  const deliveries = new Map();
  const sent = [];
  const audits = [];
  let rows = [{ operation_id: 11, patient_department: "IPD" }, { operation_id: 12, patient_department: "IPD" }];
  let failSend = false;
  let failAcknowledgement = false;
  let sourceDown = false;
  let failSkipAudit = false;
  const db = {
    surgeryNotificationCursor: {
      findUnique: async () => ({ ...cursor }),
      updateMany: async ({ where, data }) => {
        if ((where.paused !== undefined && cursor.paused !== where.paused) || (where.operationId !== undefined && cursor.operationId !== where.operationId)) return { count: 0 };
        Object.assign(cursor, data); return { count: 1 };
      },
      update: async ({ data }) => { Object.assign(cursor, data); return { ...cursor }; },
    },
    surgeryNotificationDelivery: {
      findUnique: async ({ where }) => deliveries.has(where.job_operationId.operationId) ? { ...deliveries.get(where.job_operationId.operationId) } : null,
      create: async ({ data }) => { if (deliveries.has(data.operationId)) throw new Error("duplicate claim"); deliveries.set(data.operationId, { ...data }); },
      update: async ({ where, data }) => {
        if (failAcknowledgement && data.status === "SENT") throw new Error("commit unavailable");
        Object.assign(deliveries.get(where.job_operationId.operationId), data);
      },
    },
    $transaction: async (fn) => {
      const before = structuredClone({ cursor, deliveries, audits });
      try { return await fn(db); } catch (e) { cursor = before.cursor; deliveries.clear(); for (const [k,v] of before.deliveries) deliveries.set(k,v); audits.splice(0, audits.length, ...before.audits); throw e; }
    },
  };
  const mocks = {
    "server-only": {},
    "@/lib/audit/write": { writeAudit: async (client, entry) => {
      if (entry.event === "HOSXP_SET_OR_NOTIFICATION_SKIPPED") {
        assert.equal(client, db, "skip audit must use the cursor transaction");
        if (failSkipAudit) throw new Error("skip audit unavailable");
      }
      audits.push(entry);
    } },
    "@/lib/env": { env: { NODE_ENV: "production", MOPH_NOTIFY_GROUP_CLIENT_KEY: "test", MOPH_NOTIFY_GROUP_SECRET_KEY: "test" } },
    "@/lib/prisma": { prisma: db },
    "@/lib/hosxp/operations": { getHosxpOperationRequestsAfterId: async (id) => { if (sourceDown) throw new Error("Source unavailable"); return rows.filter(r => BigInt(r.operation_id) > BigInt(id)).slice(0, 100); } },
    "./set-or-message": { SetOrNotificationError: class extends Error {}, sendSetOrMessages: async (batch) => {
      sent.push(...batch.map(r => r.operation_id));
      if (failSend) throw new Error("uncertain delivery");
    } },
  };
  let scheduler = loadScheduler(mocks);
  return {
    run: () => scheduler.runSetOrNotificationCheck(), start: () => scheduler.startSetOrNotificationScheduler(), sent, deliveries, audits,
    restart: () => { scheduler = loadScheduler(mocks); },
    setRows: (r) => { rows = r; }, resume: () => { cursor.paused = false; },
    failSend: () => { failSend = true; }, failAck: () => { failAcknowledgement = true; },
    development: () => { mocks["@/lib/env"].env.NODE_ENV = "development"; },
    sourceDown: (value) => { sourceDown = value; },
    failSkipAudit: (value) => { failSkipAudit = value; },
    get cursor() { return cursor; },
  };
}

test("deduplicates joined rows and sends distinct operations in source order", async () => {
  const f = fixture(); f.setRows([{ operation_id: 12, patient_department: "IPD" }, { operation_id: 11, patient_department: "IPD" }, { operation_id: 11, patient_department: "IPD" }]);
  await f.run(); await f.run();
  assert.deepEqual(f.sent, [11,12]); assert.equal(f.cursor.operationId, "12"); assert.equal(f.cursor.paused, false);
});

test("two workers sharing a database cannot send the same operation", async () => {
  const f = fixture(); await Promise.all([f.run(), f.run()]);
  assert.deepEqual(f.sent, [11,12]);
});

test("only explicit IPD creates deliveries; OPD and missing types advance without sending or clinical audit data", async () => {
  const f = fixture();
  f.setRows([
    { operation_id: 11, patient_department: "OPD", hn: "DEMO-HN", patient_name: "DEMO-NAME", dx_note: "DEMO-DX" },
    { operation_id: 12, patient_department: "IPD" },
    { operation_id: 13, patient_department: null, an: "DEMO-AN", ward_name: "DEMO-WARD" },
    { operation_id: 14 },
    { operation_id: 15, patient_department: "", request_timestamp: "2026-11-18 09:00:00" },
  ]);
  await f.run();
  assert.deepEqual(f.sent, [12]);
  assert.deepEqual([...f.deliveries.keys()], ["12"]);
  assert.equal(f.deliveries.get("12").status, "SENT");
  assert.equal(f.cursor.operationId, "15");
  assert.equal(f.cursor.requestAt, "2026-11-18 09:00:00");
  assert.equal(f.cursor.paused, false);
  const skipped = f.audits.filter((entry) => entry.event === "HOSXP_SET_OR_NOTIFICATION_SKIPPED");
  assert.deepEqual(skipped.map((entry) => entry.targetId), ["11", "13", "14", "15"]);
  assert.doesNotMatch(JSON.stringify(f.audits), /DEMO-HN|DEMO-NAME|DEMO-DX|DEMO-AN|DEMO-WARD/);
  f.restart(); await f.run();
  assert.deepEqual(f.sent, [12]);
});

test("a complete 100-OPD page is checkpointed once without a send claim, then later IPD is delivered", async () => {
  const f = fixture();
  f.setRows([
    ...Array.from({ length: 100 }, (_, index) => ({ operation_id: index + 11, patient_department: "OPD" })),
    { operation_id: 111, patient_department: "IPD" },
  ]);
  await f.run();
  assert.deepEqual(f.sent, []);
  assert.equal(f.deliveries.size, 0);
  assert.equal(f.cursor.operationId, "110");
  assert.equal(f.cursor.paused, false);
  assert.ok(f.audits.every((entry) => entry.event !== "HOSXP_SET_OR_NOTIFICATION_CLAIMED"));
  assert.deepEqual(f.audits.filter((entry) => entry.event === "HOSXP_SET_OR_NOTIFICATION_SKIPPED").map((entry) => entry.metadata), [{ total: 100, section: "NOTIFICATION" }]);
  f.restart(); await f.run(); await f.run();
  assert.deepEqual(f.sent, [111]);
  assert.equal(f.cursor.operationId, "111");
  assert.equal(f.deliveries.size, 1);
});

test("OPD changed to IPD after being skipped is not revisited following restart", async () => {
  const f = fixture();
  f.setRows([{ operation_id: 11, patient_department: "OPD" }]);
  await f.run();
  assert.equal(f.cursor.operationId, "11");
  f.setRows([{ operation_id: 11, patient_department: "IPD" }, { operation_id: 12, patient_department: "IPD" }]);
  f.restart(); await f.run();
  assert.deepEqual(f.sent, [12]);
  assert.equal(f.deliveries.has("11"), false);
});

test("an all-skipped checkpoint rolls back with its audit and can be retried without a pause", async () => {
  const f = fixture();
  f.setRows([{ operation_id: 11, patient_department: "OPD" }]);
  f.failSkipAudit(true);
  await assert.rejects(() => f.run(), /skip audit unavailable/);
  assert.equal(f.cursor.operationId, "10");
  assert.equal(f.cursor.paused, false);
  assert.equal(f.deliveries.size, 0);
  f.failSkipAudit(false); f.restart(); await f.run();
  assert.equal(f.cursor.operationId, "11");
  assert.deepEqual(f.sent, []);
});

test("existing paused cursors and historical OPD delivery records are left intact", async () => {
  const f = fixture();
  f.cursor.paused = true; f.cursor.lastErrorCode = "MOPH_INVALID_RESPONSE";
  const historical = { job: "SET_OR_NEW_OPERATION", operationId: "9", status: "SENT" };
  f.deliveries.set("9", structuredClone(historical));
  f.setRows([{ operation_id: 11, patient_department: "OPD" }, { operation_id: 12, patient_department: "IPD" }]);
  await f.run();
  assert.deepEqual(f.sent, []);
  assert.equal(f.cursor.operationId, "10");
  assert.equal(f.cursor.paused, true);
  assert.equal(f.cursor.lastErrorCode, "MOPH_INVALID_RESPONSE");
  assert.deepEqual(f.deliveries.get("9"), historical);
});

test("concurrent polls of an OPD page cannot overwrite a newer checkpoint", async () => {
  const f = fixture();
  f.setRows([{ operation_id: 11, patient_department: "OPD" }]);
  await Promise.all([f.run(), f.run()]);
  assert.equal(f.cursor.operationId, "11");
  assert.equal(f.cursor.paused, false);
  assert.equal(f.audits.filter((entry) => entry.event === "HOSXP_SET_OR_NOTIFICATION_SKIPPED").length, 1);
  assert.deepEqual(f.sent, []);
});

test("an IPD send failure stops before later OPD or IPD checkpoints", async () => {
  const f = fixture();
  f.setRows([
    { operation_id: 11, patient_department: "OPD" },
    { operation_id: 12, patient_department: "IPD" },
    { operation_id: 13, patient_department: "OPD" },
    { operation_id: 14, patient_department: "IPD" },
  ]);
  f.failSend(); await f.run();
  assert.deepEqual(f.sent, [12]);
  assert.equal(f.cursor.operationId, "11");
  assert.equal(f.cursor.paused, true);
  assert.equal(f.deliveries.get("12").status, "REVIEW");
  assert.equal(f.deliveries.size, 1);
});

test("uncertain delivery remains blocked even after a manual resume", async () => {
  const f = fixture(); f.failSend(); await f.run(); f.resume(); await f.run();
  assert.deepEqual(f.sent, [11]); assert.equal(f.cursor.paused, true);
  assert.equal(f.deliveries.get("11").status, "REVIEW");
});

test("lost acknowledgement cannot replay a delivered operation", async () => {
  const f = fixture(); f.failAck(); await f.run(); f.resume(); await f.run();
  assert.deepEqual(f.sent, [11]); assert.equal(f.cursor.operationId, "10"); assert.equal(f.cursor.paused, true);
});

test("rewinding a cursor never resends a recorded successful delivery", async () => {
  const f = fixture(); await f.run(); f.cursor.operationId = "10"; await f.run();
  assert.deepEqual(f.sent, [11,12]); assert.equal(f.cursor.operationId, "12");
});

test("development never polls the real notification group by default", async () => {
  const f = fixture(); f.development(); await f.run();
  assert.deepEqual(f.sent, []); assert.equal(f.deliveries.size, 0);
});

test("a source failure is visible to the monitor and clears after a successful check", async () => {
  const f = fixture(); f.sourceDown(true); await f.run();
  assert.equal(f.cursor.lastCheckErrorCode, "HOSXP_UNAVAILABLE"); assert.deepEqual(f.sent, []);
  f.sourceDown(false); await f.run();
  assert.equal(f.cursor.lastCheckErrorCode, null);
});

test("a poll with no new cases still records a durable heartbeat", async () => {
  const f = fixture(); f.setRows([]);
  const originalInterval = globalThis.setInterval;
  const previousState = globalThis.setOrNotificationScheduler;
  let interval;
  try {
    delete globalThis.setOrNotificationScheduler;
    globalThis.setInterval = (_callback, ms) => { interval = ms; return { unref() {} }; };
    f.start();
    await new Promise(setImmediate);
    assert.equal(interval, 180000);
    assert.ok(f.cursor.lastCheckedAt instanceof Date);
    assert.deepEqual(f.sent, []);
  } finally {
    globalThis.setInterval = originalInterval;
    if (previousState) globalThis.setOrNotificationScheduler = previousState;
    else delete globalThis.setOrNotificationScheduler;
  }
});
