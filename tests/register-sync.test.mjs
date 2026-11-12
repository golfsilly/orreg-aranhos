import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { normalizeOperationId } from "../lib/hosxp/operation-id.ts";
import { fiscalPeriod } from "../lib/register/fiscal-period.ts";
import { hasPermission } from "../lib/permissions.ts";
import { monthRange } from "../lib/hosxp/date-range.ts";

const nodeRequire = createRequire(import.meta.url);
const compiled = ts.transpileModule(readFileSync(new URL("../lib/register/sync.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const counterKey = ({ fiscalYear, calendarMonth, departmentId }) => `${fiscalYear}:${calendarMonth}:${departmentId}`;

/** Runs the real sync implementation against an isolated transactional memory database. */
function fixture() {
  let state = { registers: new Map(), counters: new Map(), audits: [], history: [] };
  const days = new Map();
  let role = "NURSE"; let auditFailure = false;
  const change = (record, data) => Object.entries(data).forEach(([key, value]) => { record[key] = key === "revision" && typeof value === "object" ? record.revision + value.increment : structuredClone(value); });
  const tx = {
    $queryRaw: async () => [{ id: "DEMO-ACTOR" }],
    $executeRaw: async (_, fiscalYear, calendarMonth, departmentId) => {
      const key = counterKey({ fiscalYear, calendarMonth, departmentId });
      if (!state.counters.has(key)) state.counters.set(key, { fiscalYear, calendarMonth, departmentId, lastSequence: 0 });
      return 1;
    },
    user: { findUnique: async () => ({ role, isActive: true }) },
    surgeryRegisterCounter: {
      findUniqueOrThrow: async ({ where }) => structuredClone(state.counters.get(counterKey(where.fiscalYear_calendarMonth_departmentId))),
      update: async ({ where, data }) => Object.assign(state.counters.get(counterKey(where.fiscalYear_calendarMonth_departmentId)), data),
    },
    surgeryRegister: {
      findMany: async ({ where }) => structuredClone([...state.registers.values()].filter((record) => where.hosxpOperationId.in.includes(record.hosxpOperationId))),
      create: async ({ data }) => {
        const duplicate = [...state.registers.values()].some((record) => record.hosxpOperationId === data.hosxpOperationId || counterKey(record) === counterKey(data) && record.sequence === data.sequence);
        if (duplicate) throw Object.assign(new Error("Unique conflict"), { code: "P2002" });
        const record = { ...structuredClone(data), revision: 0, staff: [], ageOverride: null, operationStartedAt: null, operationEndedAt: null, preOp: false, postOp: false, patho: false, anesthesia: null, remark: "" };
        state.registers.set(record.id, record); return record;
      },
      update: async ({ where, data }) => { const record = state.registers.get(where.id); change(record, data); return record; },
      updateMany: async ({ where, data }) => { const record = state.registers.get(where.id); if (!record || record.revision !== where.revision) return { count: 0 }; change(record, data); return { count: 1 }; },
    },
    surgeryRegisterStaff: {
      deleteMany: async ({ where }) => { state.registers.get(where.registerId).staff = []; },
      createMany: async ({ data }) => { data.forEach(({ registerId, ...member }) => state.registers.get(registerId).staff.push(member)); },
    },
    surgeryRegisterNumberChange: { create: async ({ data }) => { state.history.push(structuredClone(data)); } },
  };
  const prisma = { $transaction: async (work) => {
    const before = structuredClone(state);
    try { return await work(tx); } catch (error) { state = before; throw error; }
  } };
  const modules = {
    "server-only": {}, "@/lib/prisma": { prisma },
    "@/lib/hosxp/operation-id": { normalizeOperationId }, "@/lib/permissions": { hasPermission },
    "./fiscal-period": { fiscalPeriod }, "./details": { urgencyFromHosxp: (value) => ["ELECTIVE", "EMERGENCY"].includes(String(value).toUpperCase()) ? String(value).toUpperCase() : null },
    "@/lib/hosxp/operations": { getHosxpOperationsForDay: async (day) => structuredClone(days.get(day) ?? []), getHosxpOperationTeams: async () => [] },
    "@/lib/audit/write": { writeAudit: async (transaction, entry) => { assert.equal(transaction, tx); if (auditFailure) throw new Error("Simulated audit failure"); state.audits.push(structuredClone(entry)); } },
  };
  const loaded = { exports: {} };
  const require = (id) => { if (id === "node:crypto") return nodeRequire(id); if (!(id in modules)) throw new Error(`Unexpected dependency: ${id}`); return modules[id]; };
  new Function("require", "exports", "module", compiled)(require, loaded.exports, loaded);
  return {
    days, sync: (day) => loaded.exports.syncHosxpDay(day, "DEMO-ACTOR"),
    records: () => [...state.registers.values()], record: (id) => [...state.registers.values()].find((record) => record.hosxpOperationId === String(id)),
    state: () => state, setRole: (value) => { role = value; }, failAudit: () => { auditFailure = true; },
  };
}

const row = (id, day, spclty = "DEMO-A", extra = {}) => ({ operation_id: id, request_operation_date: day, spclty, department_name: spclty, hn: "DEMO-SAME-HN", ptname: "DEMO PATIENT", emergency_name: "Elective", ...extra });

test("shuffled and duplicate source rows allocate numeric ID order, not HN or editable clocks", async () => {
  const f = fixture(); const day = "2026-11-05";
  f.days.set(day, [row(30, day, "DEMO-A", { operation_started_at: "01:00" }), row("10", day), row(2n, day, "DEMO-A", { operation_started_at: "23:00" }), row(2, day)]);
  const result = await f.sync(day);
  assert.equal(result.created, 3);
  assert.deepEqual([2, 10, 30].map((id) => f.record(id).sequence), [1, 2, 3]);
  assert.equal(f.records().length, 3, "same HN can have separate operations; repeated IDs cannot");
  const record = f.record(10);
  Object.assign(record, { ageOverride: "DEMO AGE", operationStartedAt: new Date("2026-11-05T03:00:00Z"), operationEndedAt: new Date("2026-11-05T04:00:00Z"), preOp: true, patho: true, anesthesia: "GA", remark: "DEMO NOTE" });
  const before = structuredClone(record);
  f.days.set(day, [...f.days.get(day)].reverse());
  const repeated = await f.sync(day);
  assert.equal(repeated.created, 0); assert.equal(repeated.existing, 3);
  assert.deepEqual(f.record(10), before, "sync preserves local clinical fields and overridden times");
  assert.deepEqual([2, 10, 30].map((id) => f.record(id).sequence), [1, 2, 3]);
  assert.doesNotMatch(JSON.stringify(f.state().audits), /DEMO-SAME-HN|DEMO PATIENT|DEMO NOTE|DEMO AGE/);
});

test("a newly discovered earlier date appends 21 without changing the first twenty numbers", async () => {
  const f = fixture();
  f.days.set("2026-11-05", Array.from({ length: 20 }, (_, index) => row(index + 20, "2026-11-05")).reverse());
  await f.sync("2026-11-05");
  const before = f.records().map(({ hosxpOperationId, sequence }) => [hosxpOperationId, sequence]);
  f.days.set("2026-11-01", [row(1, "2026-11-01")]);
  await f.sync("2026-11-01");
  assert.equal(f.record(1).sequence, 21);
  assert.equal(f.record(1).operationDate.toISOString().slice(0, 10), "2026-11-01");
  before.forEach(([id, sequence]) => assert.equal(f.record(id).sequence, sequence));
});

test("monthly endpoint orders shuffled source days before allocating numeric source IDs", async () => {
  const f = fixture();
  const source = [row(2, "2026-11-07"), row(90, "2026-11-01"), row(10, "2026-11-07"), row(3, "2026-11-01")];
  for (const day of ["2026-11-07", "2026-11-01"]) f.days.set(day, source.filter((entry) => entry.request_operation_date === day));
  const processed = [];
  const dependencies = {
    zod: nodeRequire("zod"),
    "@/lib/security/request-origin": { hasTrustedRequestOrigin: (request) => request.headers.get("origin") === "http://localhost" },
    "@/lib/authorization": { getAuthorizedUser: async () => ({ id: "DEMO-ACTOR" }) },
    "@/lib/audit/denied": { recordDenied: async () => { throw new Error("Unexpected denial"); } },
    "@/lib/hosxp/date-range": { monthRange },
    "@/lib/hosxp/operations": { getHosxpOperationsForMonth: async () => structuredClone(source) },
    "@/lib/prisma": { prisma: { $transaction: async (work) => work({}) } },
    "@/lib/register/fiscal-period": { fiscalPeriod },
    "@/lib/register/sync": { syncHosxpDay: async (day) => { processed.push(day); return f.sync(day); } },
    "@/lib/audit/write": { writeAudit: async () => {} },
  };
  const output = ts.transpileModule(readFileSync(new URL("../app/api/hosxp/sync/month/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const route = { exports: {} };
  new Function("require", "exports", "module", output)((id) => { if (!(id in dependencies)) throw new Error(`Unexpected dependency: ${id}`); return dependencies[id]; }, route.exports, route);
  const response = await route.exports.POST(new Request("http://localhost/api/hosxp/sync/month", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost" }, body: JSON.stringify({ month: "2026-11" }) }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).created, 4);
  assert.deepEqual(processed, ["2026-11-01", "2026-11-07"]);
  assert.deepEqual([3, 90, 2, 10].map((id) => f.record(id).sequence), [1, 2, 3, 4], "date takes precedence over numeric ID across days");
});

test("counters are independent by department, month and October fiscal-year boundary", async () => {
  const f = fixture();
  f.days.set("2026-09-30", [row(1, "2026-09-30")]); await f.sync("2026-09-30");
  f.days.set("2026-10-01", [row(2, "2026-10-01"), row(3, "2026-10-01", "DEMO-B")]); await f.sync("2026-10-01");
  f.days.set("2026-11-01", [row(4, "2026-11-01")]); await f.sync("2026-11-01");
  f.days.set("2027-10-01", [row(5, "2027-10-01")]); await f.sync("2027-10-01");
  assert.ok(f.records().every((record) => record.sequence === 1));
  assert.equal(f.record(1).fiscalYear, 2569); assert.equal(f.record(2).fiscalYear, 2570); assert.equal(f.record(5).fiscalYear, 2571);
  assert.equal(f.state().counters.size, 5);
});

test("date changes within a month keep the number; month/department moves issue a destination number", async () => {
  const f = fixture();
  f.days.set("2026-11-01", [row(1, "2026-11-01"), row(2, "2026-11-01", "DEMO-B")]); await f.sync("2026-11-01");
  f.record(1).remark = "DEMO PRESERVE"; f.record(1).preOp = true;
  f.days.set("2026-11-07", [row(1, "2026-11-07")]);
  assert.equal((await f.sync("2026-11-07")).dateUpdated, 1); assert.equal(f.record(1).sequence, 1);
  f.days.set("2026-11-08", [row(1, "2026-11-08", "DEMO-B")]);
  assert.equal((await f.sync("2026-11-08")).departmentUpdated, 1);
  assert.equal(f.record(1).sequence, 2); assert.equal(f.record(2).sequence, 1);
  f.days.set("2026-12-01", [row(1, "2026-12-01", "DEMO-B")]);
  assert.equal((await f.sync("2026-12-01")).renumbered, 1);
  assert.equal(f.record(1).sequence, 1); assert.equal(f.record(1).calendarMonth, 12);
  assert.equal(f.record(1).remark, "DEMO PRESERVE"); assert.equal(f.record(1).preOp, true);
  assert.equal(f.state().history.length, 3);
});

test("authorization and audit failures cannot commit registers or counters", async () => {
  for (const failure of ["permission", "audit"]) {
    const f = fixture(); f.days.set("2026-11-01", [row(1, "2026-11-01")]);
    if (failure === "permission") f.setRole("DOCTOR"); else f.failAudit();
    await assert.rejects(f.sync("2026-11-01"));
    assert.equal(f.records().length, 0); assert.equal(f.state().counters.size, 0); assert.equal(f.state().audits.length, 0);
  }
});
