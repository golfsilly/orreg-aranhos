import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as contract from "../lib/notifications/monitor-contract.ts";

const now = new Date("2026-11-16T06:00:00Z");
test("monitor API parameters strictly cap history at seven rolling days", () => {
  const q = contract.parseMonitorQuery(new URLSearchParams());
  const window = contract.monitorWindow(q.days, now);
  assert.equal(window.gte.toISOString(), "2026-11-09T06:00:00.000Z");
  assert.equal(window.lte, now);
  for (const raw of ["days=8", "days=0", "days=7&days=1", "from=2020-01-01", "pageSize=100", "page=-1", "q=patient-name", "status=BAD"])
    assert.throws(() => contract.parseMonitorQuery(new URLSearchParams(raw)), raw);
});

test("health never calls a disabled, paused, failed or stale scheduler healthy", () => {
  const input = { now, enabled: true, configured: true, cursor: { paused: false, lastErrorCode: null, lastCheckedAt: new Date(now.getTime() - 5 * 60000), lastCheckErrorCode: null } };
  assert.equal(contract.monitorHealth(input), "ACTIVE");
  assert.equal(contract.monitorHealth({ ...input, enabled: false }), "DISABLED");
  assert.equal(contract.monitorHealth({ ...input, configured: false }), "UNCONFIGURED");
  assert.equal(contract.monitorHealth({ ...input, cursor: null }), "WAITING");
  assert.equal(contract.monitorHealth({ ...input, cursor: { ...input.cursor, lastCheckedAt: null } }), "WAITING");
  assert.equal(contract.monitorHealth({ ...input, cursor: { ...input.cursor, lastCheckedAt: new Date(now.getTime() - 9 * 60000) } }), "STALE");
  assert.equal(contract.monitorHealth({ ...input, cursor: { ...input.cursor, lastCheckErrorCode: "HOSXP_UNAVAILABLE" } }), "CHECK_FAILED");
  assert.equal(contract.monitorHealth({ ...input, cursor: { ...input.cursor, paused: true } }), "PAUSED");
  assert.equal(contract.monitorHealth({ ...input, cursor: { ...input.cursor, paused: true, lastErrorCode: "SEND_IN_PROGRESS" } }), "SENDING");
  assert.equal(contract.safeMonitorError("private error text / secret"), "UNKNOWN");
});

function load(file, deps) {
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)((id) => {
    if (!(id in deps)) throw new Error(`Unexpected dependency ${id}`);
    return deps[id];
  }, mod, mod.exports);
  return mod.exports;
}

function matches(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return value.some((part) => matches(row, part));
    if (value === null) return row[key] === null;
    if (typeof value !== "object") return row[key] === value;
    if ("contains" in value) return row[key].includes(value.contains);
    return row[key] instanceof Date && row[key] >= value.gte && row[key] <= value.lte;
  });
}

function fixture({ role = "SUPERADMIN", sourceDown = false } = {}) {
  const audits = []; const lookups = []; let reads = 0;
  const row = (operationId, status, age, sentAge = age) => ({ job: "SET_OR_NEW_OPERATION", operationId, status, errorCode: status === "REVIEW" ? "MOPH_INVALID_RESPONSE" : null, createdAt: new Date(now.getTime() - age * 86400000), sentAt: status === "SENT" ? new Date(now.getTime() - sentAge * 86400000) : null });
  const records = [row("100", "SENT", 1), row("101", "REVIEW", 2), row("102", "CLAIMED", 3), row("103", "SENT", 8), row("104", "REVIEW", 8), row("105", "SENT", 10, 1), row("106", "SENT", -1)];
  const ledger = {
    groupBy: async ({ where }) => { reads++; const filtered = records.filter((r) => matches(r, where)); return [...new Set(filtered.map((r) => r.status))].map((status) => ({ status, _count: { _all: filtered.filter((r) => r.status === status).length } })); },
    count: async ({ where }) => records.filter((r) => matches(r, where)).length,
    findMany: async ({ where, take, skip }) => {
      assert.ok(take <= 50); assert.ok(skip >= 0);
      return records.filter((r) => matches(r, where)).sort((a, b) => b.createdAt - a.createdAt).slice(skip, skip + take);
    },
    findFirst: async ({ where }) => records.filter((r) => matches(r, where)).sort((a, b) => b.sentAt - a.sentAt)[0] ?? null,
  };
  const tx = { surgeryNotificationCursor: { findUnique: async () => ({ operationId: "99", paused: false, lastErrorCode: null, lastCheckedAt: now, lastCheckErrorCode: null }) }, surgeryNotificationDelivery: ledger };
  const prisma = { $transaction: async (fn) => fn(tx) };
  const deps = {
    "server-only": {}, "@/lib/prisma": { prisma },
    "@/lib/env": { env: { NODE_ENV: "production", MOPH_NOTIFY_GROUP_CLIENT_KEY: "secret-client", MOPH_NOTIFY_GROUP_SECRET_KEY: "secret-key" } },
    "@/lib/audit/write": { writeAudit: async (_, event) => audits.push(event) },
    "@/lib/hosxp/operations": { getHosxpNotificationPatients: async (ids) => {
      assert.ok(audits.length > 0, "clinical lookups require an audit first");
      lookups.push(ids); if (sourceDown) throw new Error("private source error");
      return new Map(ids.map((id) => [id, { name: "Synthetic Patient", hn: "DEMO-HN", operationDate: "2026-11-15" }]));
    } },
    "./monitor-contract": contract,
  };
  const service = load("../lib/notifications/monitor-service.ts", deps);
  const route = load("../app/api/admin/notifications/route.ts", {
    "@/lib/authorization": { getAuthorizedUser: async () => role ? { id: "ACTOR", role } : null },
    "@/lib/audit/denied": { recordDenied: async () => audits.push({ outcome: "DENIED" }) },
    "@/lib/audit/write": deps["@/lib/audit/write"], "@/lib/prisma": { prisma },
    "@/lib/notifications/monitor-contract": contract,
    "@/lib/notifications/monitor-service": { loadNotificationMonitor: (q, id) => service.loadNotificationMonitor(q, id, now) },
  });
  return { get: (query = "") => route.GET(new Request(`http://localhost/api/admin/notifications${query}`)), audits, lookups, reads: () => reads };
}

test("only superadmin can read identities or notification history", async () => {
  for (const role of [null, "USER", "NURSE", "DOCTOR", "ADMIN"]) {
    const f = fixture({ role }); const r = await f.get();
    assert.equal(r.status, 403); assert.equal(f.reads(), 0); assert.equal(f.lookups.length, 0);
    assert.equal(f.audits[0].outcome, "DENIED");
  }
});

test("server rejects an over-seven-day window before reading the database", async () => {
  const f = fixture(); assert.equal((await f.get("?days=8")).status, 400); assert.equal(f.reads(), 0);
});

test("history is capped, excludes future entries and resolves only visible IDs", async () => {
  const f = fixture(); const response = await f.get();
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "private, no-store");
  const data = contract.monitorResponseSchema.parse(await response.json());
  assert.deepEqual(data.rows.map((r) => r.operationId), ["100", "101", "102", "105"]);
  assert.deepEqual(f.lookups[0], ["100", "101", "102", "105"]);
  assert.deepEqual(data.counts, { total: 4, sent: 2, review: 1, claimed: 1 });
  assert.equal(data.health, "ACTIVE");
  assert.doesNotMatch(JSON.stringify(data), /secret-client|secret-key/);
  assert.doesNotMatch(JSON.stringify(f.audits), /Synthetic Patient|DEMO-HN/);
});

test("status and ID filters and server pagination apply before identity lookup", async () => {
  const f = fixture(); const data = await (await f.get("?status=SENT&q=105&pageSize=10")).json();
  assert.equal(data.total, 1); assert.deepEqual(f.lookups[0], ["105"]);
  const second = fixture(); const page = await (await second.get("?page=2&pageSize=10")).json();
  assert.deepEqual(page.rows, []); assert.deepEqual(second.lookups[0], []);
});

test("HOSxP outage preserves delivery results without exposing raw errors", async () => {
  const f = fixture({ sourceDown: true }); const data = await (await f.get()).json();
  assert.equal(data.sourceAvailable, false); assert.equal(data.rows[0].status, "SENT");
  assert.ok(data.rows.every((r) => r.patient === null));
  assert.doesNotMatch(JSON.stringify(data), /private source error/);
});

test("identity resolver rejects oversized or invalid batches before connecting to HOSxP", async () => {
  const source = load("../lib/hosxp/operations.ts", {
    "server-only": {}, "@/lib/env": { env: {} },
    mariadb: { createPool: () => { throw new Error("Unexpected HOSxP access"); } },
    "./date-range": {}, "./operation-query": {}, "./positions": {},
  });
  assert.equal((await source.getHosxpNotificationPatients([])).size, 0);
  await assert.rejects(() => source.getHosxpNotificationPatients(Array.from({ length: 51 }, (_, i) => String(i + 1))), /Invalid notification operation IDs/);
  for (const ids of [["-1"], ["1 OR 1=1"], ["0"], ["not-an-id"]])
    await assert.rejects(() => source.getHosxpNotificationPatients(ids), /Invalid notification operation IDs/);
});
