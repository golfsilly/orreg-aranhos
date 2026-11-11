import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { z } from "zod";
import * as statistics from "../lib/register/statistics.ts";
import { normalizeOperationId } from "../lib/hosxp/operation-id.ts";
import { statisticsResponseSchema } from "../lib/register/statistics-contract.ts";

const compiled = ts.transpileModule(readFileSync(new URL("../app/api/reports/statistics/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function fixture({ available = true, authorized = true } = {}) {
  const audits = [];
  let queried = false;
  const base = { operationDate: new Date("2026-11-07T00:00:00Z"), roomEnteredAt: null, roomExitedAt: null, operationStartedAt: null, operationEndedAt: null, anesthesia: null, surgeryClass: null };
  const registers = [
    { ...base, id: "R1", hosxpOperationId: "101", departmentId: "01", operationStartedAt: new Date("2026-11-07T02:00:00Z"), operationEndedAt: new Date("2026-11-07T03:00:00Z"), anesthesia: "GA", surgeryClass: "MAJOR" },
    { ...base, id: "R2", hosxpOperationId: "102", departmentId: "01", operationStartedAt: new Date("2026-11-07T04:00:00Z"), operationEndedAt: new Date("2026-11-07T03:00:00Z") },
    { ...base, id: "R3", hosxpOperationId: "103", departmentId: "02" },
  ];
  const first = { operation_id: 101, spclty: "01", department_name: "แผนกจำลอง A", room_id: "1", request_operation_date: "2026-11-07", operation_started_at: "2026-11-07 09:00:00", operation_ended_at: "2026-11-07 12:00:00", emergency_name: "ไม่ฉุกเฉิน", operation_item_name: "หัตถการ A", ward_name: "Ward A", status_name: "ผ่าตัดเสร็จ" };
  const sources = [first, { ...first, operation_item_name: "หัตถการ B" }, { ...first }, { ...first, operation_id: 103, spclty: "02", department_name: "แผนกจำลอง B", operation_started_at: "2026-11-07 23:30:00", operation_ended_at: "2026-11-08 00:30:00", emergency_name: "Emergency" }];
  const staff = Array.from({ length: 12 }, (_, index) => ({ registerId: "R1", hosxpStaffCode: String(index), staffName: "แพทย์จำลอง " + index }));
  staff.push({ ...staff[0] });
  const tx = {
    surgeryRegister: { findMany: async () => { queried = true; return registers; } },
    surgeryRegisterStaff: { findMany: async ({ where }) => staff.filter((row) => !where.register.departmentId || registers.find((item) => item.id === row.registerId).departmentId === where.register.departmentId) },
  };
  const deps = {
    zod: { z }, "@/lib/authorization": { getAuthorizedUser: async () => authorized ? { id: "ACTOR" } : null },
    "@/lib/audit/denied": { recordDenied: async (...entry) => audits.push(entry) },
    "@/lib/audit/write": { writeAudit: async (_, entry) => audits.push(entry) },
    "@/lib/prisma": { prisma: { $transaction: async (work) => work(tx) } },
    "@/lib/hosxp/operation-id": { normalizeOperationId }, "@/lib/register/statistics": statistics,
    "@/lib/hosxp/operations": {
      getHosxpOperatingRooms: async () => { if (!available) throw new Error("Synthetic outage"); return [{ id: "1", name: "ห้องจำลอง" }]; },
      getHosxpOperationAnalyticsForRange: async () => structuredClone(sources),
    },
  };
  const loaded = { exports: {} };
  const service = { exports: {} };
  const serviceCode = ts.transpileModule(readFileSync(new URL("../lib/register/statistics-service.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "exports", "module", serviceCode)((id) => id === "server-only" ? {} : deps[id], service.exports, service);
  deps["@/lib/register/statistics-service"] = service.exports;
  new Function("require", "exports", "module", compiled)((id) => { if (!(id in deps)) throw new Error("Unexpected import: " + id); return deps[id]; }, loaded.exports, loaded);
  return { get: (params = "") => loaded.exports.GET(new Request("http://localhost/api/reports/statistics?period=day&value=2026-11-07" + params)), audits, queried: () => queried };
}

test("management statistics deduplicate joins, respect overrides and retain all doctors", async () => {
  const run = fixture();
  const response = await run.get();
  assert.equal(response.status, 200);
  const data = statisticsResponseSchema.parse(await response.json());
  assert.equal(data.totalCases, 3);
  assert.equal(data.sourceCases, 2);
  assert.equal(data.averageDurationMinutes, 60);
  assert.equal(data.durationCases, 2);
  assert.equal(data.doctors.length, 12);
  assert.equal(data.doctors[0].cases, 1);
  assert.equal(data.emergency.find((row) => row.name === "Elective").count, 1);
  assert.equal(data.series.find((row) => row.key === "09").cases, 1);
  assert.equal(data.series.find((row) => row.key === "23").cases, 1);
  assert.equal(data.quality.missingSource, 1);
  assert.equal(data.quality.missingDoctor, 2);
  assert.equal(data.quality.missingDuration, 1);
  assert.equal(data.missingUtilizationTimes, 1);
  assert.equal(data.utilization.usedMinutes, 90, "overnight time is clipped to selected day");
  assert.doesNotMatch(JSON.stringify(run.audits), /แพทย์|Ward|หัตถการ|hosxpOperationId/);
});

test("department filter applies to counts, doctors and room time but retains all department choices", async () => {
  const response = await fixture().get("&department=02");
  const data = statisticsResponseSchema.parse(await response.json());
  assert.equal(data.totalCases, 1);
  assert.equal(data.doctors.length, 0);
  assert.equal(data.sourceCases, 1);
  assert.equal(data.departments.length, 2);
  assert.equal(data.utilization.usedMinutes, 30);
  assert.equal(data.quality.missingDoctor, 1);
});

test("source outage preserves stored counts and times without inventing source statistics", async () => {
  const data = statisticsResponseSchema.parse(await (await fixture({ available: false }).get()).json());
  assert.equal(data.hosxpAvailable, false);
  assert.equal(data.totalCases, 3);
  assert.equal(data.sourceCases, 0);
  assert.equal(data.utilization, null);
  assert.equal(data.averageDurationMinutes, 60);
  assert.equal(data.durationCases, 1);
  assert.equal(data.missingUtilizationTimes, 3);
});

test("unauthorized statistics requests are denied before database reads", async () => {
  const run = fixture({ authorized: false });
  assert.equal((await run.get()).status, 403);
  assert.equal(run.queried(), false);
  assert.equal(run.audits.length, 1);
});
