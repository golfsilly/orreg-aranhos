import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const compiled = ts.transpileModule(readFileSync(new URL("../lib/notifications/set-or-scheduler.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture() {
  let cursor = { operationId: "10", requestAt: "2026-11-12 10:00:00", paused: false };
  const deliveries = new Map();
  const sent = [];
  let rows = [{ operation_id: 11 }, { operation_id: 12 }];
  let failSend = false;
  let failAcknowledgement = false;
  const db = {
    surgeryNotificationCursor: {
      findUnique: async () => ({ ...cursor }),
      updateMany: async ({ where, data }) => {
        if (cursor.paused || cursor.operationId !== where.operationId) return { count: 0 };
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
      const before = structuredClone({ cursor, deliveries });
      try { return await fn(db); } catch (e) { cursor = before.cursor; deliveries.clear(); for (const [k,v] of before.deliveries) deliveries.set(k,v); throw e; }
    },
  };
  const mocks = {
    "server-only": {},
    "@/lib/audit/write": { writeAudit: async () => {} },
    "@/lib/env": { env: { NODE_ENV: "production", MOPH_NOTIFY_GROUP_CLIENT_KEY: "test", MOPH_NOTIFY_GROUP_SECRET_KEY: "test" } },
    "@/lib/prisma": { prisma: db },
    "@/lib/hosxp/operations": { getHosxpOperationRequestsAfterId: async (id) => rows.filter(r => BigInt(r.operation_id) > BigInt(id)) },
    "./set-or-message": { SetOrNotificationError: class extends Error {}, sendSetOrMessages: async (batch) => {
      sent.push(...batch.map(r => r.operation_id));
      if (failSend) throw new Error("uncertain delivery");
    } },
  };
  const mod = { exports: {} };
  new Function("require", "module", "exports", compiled)((id) => {
    if (!(id in mocks)) throw new Error(`Unexpected module ${id}`); return mocks[id];
  }, mod, mod.exports);
  return {
    run: mod.exports.runSetOrNotificationCheck, sent, deliveries,
    setRows: (r) => { rows = r; }, resume: () => { cursor.paused = false; },
    failSend: () => { failSend = true; }, failAck: () => { failAcknowledgement = true; },
    development: () => { mocks["@/lib/env"].env.NODE_ENV = "development"; },
    get cursor() { return cursor; },
  };
}

test("deduplicates joined rows and sends distinct operations in source order", async () => {
  const f = fixture(); f.setRows([{ operation_id: 12 }, { operation_id: 11 }, { operation_id: 11 }]);
  await f.run(); await f.run();
  assert.deepEqual(f.sent, [11,12]); assert.equal(f.cursor.operationId, "12"); assert.equal(f.cursor.paused, false);
});

test("two workers sharing a database cannot send the same operation", async () => {
  const f = fixture(); await Promise.all([f.run(), f.run()]);
  assert.deepEqual(f.sent, [11,12]);
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
