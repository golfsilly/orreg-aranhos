import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { z } from "zod";
import { externalStatistics, validReportsKey } from "../lib/register/external-statistics.ts";
import { statisticsRange } from "../lib/register/statistics.ts";

const secret = "a".repeat(64);
const source = {
  period: "MONTH", value: "2026-11", start: "2026-11-01", end: "2026-12-01", generatedAt: "2026-11-11T00:00:00Z",
  totalCases: 5, sourceCases: 5, series: [], departments: [], emergency: [{ name: "Elective", count: 3 }, { name: "Emergency", count: 1 }, { name: "ไม่ระบุ", count: 1 }],
  averageDurationMinutes: 20, durationCases: 4, postponed: 0, cancelled: 0, utilization: null,
  roomTimeCases: 0, estimatedRoomCases: 4, missingUtilizationTimes: 1, hosxpAvailable: true,
  doctors: [{ name: "PRIVATE_STAFF" }], procedures: [{ name: "PRIVATE_PROCEDURE" }], wards: [], hn: "PRIVATE_HN",
};
const code = ts.transpileModule(readFileSync(new URL("../app/api/external/reports/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function fixture({ key = secret, available = true } = {}) {
  let calls = 0;
  const audits = [];
  const deps = {
    zod: { z }, "@/lib/env": { env: { EXTERNAL_REPORTS_API_KEY: key } }, "@/lib/prisma": { prisma: {} },
    "@/lib/audit/write": { writeAudit: async (_, entry) => audits.push(entry) },
    "@/lib/register/statistics-service": { loadStatistics: async () => { calls++; return { ...source, hosxpAvailable: available }; } },
    "@/lib/register/statistics": { statisticsRange },
    "@/lib/register/external-statistics": { externalStatistics, validReportsKey },
  };
  const loaded = { exports: {} };
  new Function("require", "exports", "module", code)((id) => { assert.ok(id in deps, id); return deps[id]; }, loaded.exports, loaded);
  return { calls: () => calls, audits, get: (query = "period=month&value=2026-11", token = secret) => loaded.exports.GET(new Request(`http://localhost/api/external/reports?${query}`, { headers: token ? { authorization: `Bearer ${token}` } : {} })) };
}
test("external API denies missing/wrong credentials before reading statistics; disabled by default", async () => {
  const run = fixture();
  assert.equal((await run.get(undefined, null)).status, 401);
  assert.equal((await run.get(undefined, "bad")).status, 401);
  assert.equal(run.calls(), 0);
  assert.equal(run.audits[0].outcome, "DENIED");
  assert.equal((await fixture({ key: "" }).get()).status, 503);
});
test("external snapshot excludes personal and arbitrary fields, preserves totals and caches reads", async () => {
  const run = fixture();
  const response = await run.get();
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.totalCases, 5);
  assert.equal(data.emergency.reduce((sum, row) => sum + row.count, 0), 5);
  assert.doesNotMatch(JSON.stringify(data), /PRIVATE|doctors|procedures|wards|hn/);
  await run.get();
  assert.equal(run.calls(), 1);
  assert.equal(run.audits.length, 2);
  assert.doesNotMatch(JSON.stringify(run.audits), /PRIVATE|Bearer|aaaa/);
});
test("invalid dates, unsupported filters and repeated parameters are rejected", async () => {
  const run = fixture();
  for (const query of ["period=day&value=2026-02-30", "period=month&value=2026-13", "period=year&value=9999", "period=month&value=2026-11&department=01", "period=month&period=day&value=2026-11"]) assert.equal((await run.get(query)).status, 400);
  assert.equal(run.calls(), 0);
});
test("HOSxP failures are not cached or returned as successful zero counts", async () => {
  const run = fixture({ available: false });
  assert.equal((await run.get()).status, 503);
  assert.equal((await run.get()).status, 503);
  assert.equal(run.calls(), 2);
});
test("authenticated request rate is limited", async () => {
  const run = fixture();
  for (let i = 0; i < 30; i++) assert.equal((await run.get()).status, 200);
  const response = await run.get();
  assert.equal(response.status, 429);
  assert.ok(response.headers.get("Retry-After"));
});
