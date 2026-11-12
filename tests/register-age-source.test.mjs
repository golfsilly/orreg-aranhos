import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { normalizeOperationId } from "../lib/hosxp/operation-id.ts";
import { dayRange, monthRange } from "../lib/hosxp/date-range.ts";
import { fiscalPeriod, formatRegisterNumber } from "../lib/register/fiscal-period.ts";

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

test("the retired manual time mutation endpoint remains unavailable", () => {
  assert.equal(existsSync(new URL("../app/api/register/[operationId]/times/route.ts", import.meta.url)), false);
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
