import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { normalizeOperationId } from "../lib/hosxp/operation-id.ts";
import { dayRange, monthRange } from "../lib/hosxp/date-range.ts";
import { fiscalPeriod, formatRegisterNumber } from "../lib/register/fiscal-period.ts";
import { parseRegisterTimes, timeFields } from "../lib/register/times.ts";

const require = createRequire(import.meta.url);
function load(file, dependencies) {
  const output = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "exports", "module", output)((id) => {
    if (id === "zod") return require(id);
    if (!(id in dependencies)) throw new Error(`Unexpected dependency: ${id}`);
    return dependencies[id];
  }, loaded.exports, loaded);
  return loaded.exports;
}

function timesFixture() {
  const record = { id: "DEMO-REGISTER", revision: 0, ageOverride: "LEGACY VALUE", ...Object.fromEntries(timeFields.map((field) => [field, null])) };
  const audits = []; const changes = []; const writes = [];
  const findUnique = async ({ select }) => { assert.equal("ageOverride" in select, false); return Object.fromEntries(Object.keys(select).map((key) => [key, record[key]])); };
  const tx = { surgeryRegister: { findUnique, updateMany: async ({ data }) => { writes.push(data); assert.equal("ageOverride" in data, false); Object.assign(record, data, { revision: record.revision + 1 }); return { count: 1 }; } }, surgeryRegisterTimeChange: { create: async (data) => changes.push(data) } };
  const prisma = { surgeryRegister: { findUnique }, $transaction: async (work) => work(tx) };
  const route = load("../app/api/register/[operationId]/times/route.ts", {
    "@/lib/authorization": { getAuthorizedUser: async () => ({ id: "DEMO-ACTOR" }) },
    "@/lib/hosxp/operation-id": { normalizeOperationId }, "@/lib/prisma": { prisma },
    "@/lib/register/times": { parseRegisterTimes, timeFields },
    "@/lib/audit/write": { writeAudit: async (db, entry) => { if (entry.outcome === "SUCCESS" && entry.event === "REGISTER_TIMES_UPDATED") assert.equal(db, tx); audits.push(entry); } },
    "@/lib/audit/denied": { recordDenied: async () => {} },
  });
  const context = { params: Promise.resolve({ operationId: "1" }) };
  return { record, audits, writes, changes, get: () => route.GET(new Request("http://localhost/api/register/1/times"), context), patch: (body) => route.PATCH(new Request("http://localhost/api/register/1/times", { method: "PATCH", headers: { Origin: "http://localhost", "Content-Type": "application/json" }, body: JSON.stringify(body) }), context) };
}

test("time API rejects legacy age edits and never returns an editable age", async () => {
  const f = timesFixture();
  assert.equal("ageOverride" in await (await f.get()).json(), false);
  const response = await f.patch({ revision: 0, times: Object.fromEntries(timeFields.map((field) => [field, ""])), ageOverride: "DEMO EDIT" });
  assert.equal(response.status, 400); assert.equal(f.writes.length, 0); assert.equal(f.record.ageOverride, "LEGACY VALUE");
  assert.equal(f.audits.at(-1).metadata.reason, "INVALID_INPUT");
});

test("time API still saves cross-midnight times and restores source times with transactional audit", async () => {
  const f = timesFixture();
  const times = { roomEnteredAt: "2026-11-07T23:00", operationStartedAt: "2026-11-07T23:15", operationEndedAt: "2026-11-08T00:30", roomExitedAt: "2026-11-08T00:45" };
  assert.equal((await f.patch({ revision: 0, times })).status, 200);
  assert.equal(f.record.operationEndedAt.toISOString(), "2026-11-07T17:30:00.000Z");
  assert.equal(f.record.ageOverride, "LEGACY VALUE");
  assert.equal((await f.patch({ revision: 1, times, useHosxpTimes: { operationStartedAt: true, operationEndedAt: true } })).status, 200);
  assert.equal(f.record.operationStartedAt, null); assert.equal(f.record.operationEndedAt, null);
  assert.equal(f.changes.length, 2);
  assert.equal(f.audits.filter((entry) => entry.event === "REGISTER_TIMES_UPDATED" && entry.outcome === "SUCCESS").length, 2);
  assert.doesNotMatch(JSON.stringify(f.audits), /LEGACY VALUE|DEMO EDIT/);
});

for (const age of ["40 ปี", null]) test(`register and daily exports use only HOSxP age (${age ?? "missing"})`, async () => {
  const day = "2026-11-07";
  const source = [{ operation_id: 1, request_operation_date: day, spclty: "DEMO-A", age_text: age }];
  const register = { hosxpOperationId: "1", sequence: 1, calendarMonth: 11, fiscalYear: 2570, departmentId: "DEMO-A", operationDate: new Date(`${day}T00:00:00Z`), ageOverride: "LEGACY VALUE", staff: [] };
  const dependencies = {
    "server-only": {}, "@/lib/authorization": { getAuthorizedUser: async () => ({ id: "DEMO-ACTOR" }) },
    "@/lib/hosxp/date-range": { dayRange, monthRange },
    "@/lib/hosxp/operations": { getHosxpOperationsForDay: async () => source, getHosxpOperationsForMonth: async () => source, getHosxpOperationTeams: async () => [] },
    "@/lib/hosxp/operation-id": { normalizeOperationId }, "@/lib/register/fiscal-period": { fiscalPeriod, formatRegisterNumber },
    "@/lib/prisma": { prisma: { surgeryRegister: { findMany: async ({ select }) => { assert.equal("ageOverride" in select, false); return [register]; } } } },
    "@/lib/audit/write": { writeAudit: async () => {} }, "@/lib/audit/denied": { recordDenied: async () => {} },
  };
  const { GET } = load("../app/api/hosxp/operations/route.ts", dependencies);
  const response = await GET(new Request(`http://localhost/api/hosxp/operations?date=${day}`));
  assert.equal(response.status, 200);
  const { operations } = await response.json();
  assert.equal(operations[0].effectiveAge, age); assert.equal("ageOverride" in operations[0], false);
  const { getDailyRegisterRows } = load("../lib/register/daily-export-data.ts", dependencies);
  assert.equal((await getDailyRegisterRows(day))[0].age, age);
});
