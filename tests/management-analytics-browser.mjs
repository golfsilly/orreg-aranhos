// Real analytics components with synthetic API responses. Never contacts clinical APIs.
import { chromium, expect } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";

const harness = resolve("app/or-reg-analytics-check");
if (existsSync(harness)) throw new Error("Refusing to overwrite an existing harness");
const artifacts = resolve(".next/analytics-check");
mkdirSync(artifacts, { recursive: true });
const data = {
  period: "MONTH", value: "2026-11", generatedAt: "2026-11-11T06:00:00Z", start: "2026-11-01", end: "2026-12-01",
  totalCases: 180, sourceCases: 170, doctorCount: 12,
  series: Array.from({ length: 30 }, (_, i) => ({ key: "2026-11-" + String(i + 1).padStart(2, "0"), label: String(i + 1), cases: i < 10 ? 18 : 0 })),
  doctors: Array.from({ length: 12 }, (_, i) => ({ id: String(i), name: "แพทย์จำลอง " + (i + 1), cases: 25 - i })),
  departments: [{ id: "01", name: "ศัลยกรรมจำลอง", count: 120 }, { id: "02", name: "แผนกทดสอบชื่อยาวสำหรับการแสดงผลบนหน้าจอมือถือ", count: 60 }],
  emergency: [{ name: "Elective", count: 120 }, { name: "Emergency", count: 40 }, { name: "ไม่ระบุ", count: 10 }],
  procedures: [{ name: "หัตถการจำลอง A", count: 70 }, { name: "หัตถการจำลอง B", count: 40 }],
  wards: [{ name: "Ward จำลอง A", count: 120 }, { name: "Ward จำลอง B", count: 50 }],
  statuses: [{ name: "ผ่าตัดเสร็จ", count: 165 }, { name: "เลื่อน", count: 3 }, { name: "ยกเลิก", count: 2 }],
  postponed: 3, cancelled: 2, averageDurationMinutes: 74, durationCases: 160,
  durationBuckets: [{ name: "ไม่เกิน 30 นาที", count: 40 }, { name: "31–60 นาที", count: 60 }, { name: "61–120 นาที", count: 40 }, { name: "มากกว่า 2 ชั่วโมง", count: 20 }],
  utilization: { usedMinutes: 8640, availableMinutes: 259200, percent: 3.3, rooms: Array.from({ length: 6 }, (_, i) => ({ id: String(i), name: "ห้องผ่าตัด " + (i + 1), usedMinutes: 1440, availableMinutes: 43200, percent: 3.3 })) },
  missingRoomTimes: 180, roomTimeCases: 0, estimatedRoomCases: 160, missingUtilizationTimes: 20,
  hosxpAvailable: true, quality: { missingSource: 10, missingDoctor: 15, missingDuration: 20, missingAnesthesia: 12, missingSurgeryClass: 8 },
};
const errors = [];
let browser;
mkdirSync(harness, { recursive: true });
writeFileSync(resolve(harness, "page.tsx"), `"use client";
import { useState } from "react";
import { AnalyticsHeader } from "@/features/reports/components/analytics-header";
import { SurgeryStatistics } from "@/features/reports/components/surgery-statistics";
export default function CheckPage() {
  const [overview, setOverview] = useState(true);
  return <main className="mx-auto max-w-[1328px] space-y-6 p-4 sm:p-7"><button onClick={() => setOverview(!overview)}>เปลี่ยนมุมมองทดสอบ</button><AnalyticsHeader overview={overview} canReadRegisters /><SurgeryStatistics initialDay="2026-11-11" overview={overview} canReadRegisters /></main>;
}`, "utf8");
writeFileSync(resolve(harness, "loading.tsx"), 'export { ReportsSkeleton as default } from "@/features/reports/components/reports-skeleton";', "utf8");
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  for (const viewport of [{ width: 390, height: 844 }, { width: 834, height: 1112 }, { width: 1440, height: 1000 }]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport, colorScheme: theme, locale: "th-TH", timezoneId: "Asia/Bangkok" });
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
      const requests = [];
      let state = "normal";
      await page.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname !== "/api/reports/statistics") return route.abort();
        requests.push(url.searchParams);
        if (state === "failure") return route.fulfill({ status: 503, json: { error: "Synthetic error" } });
        const result = structuredClone(data);
        if (state === "outage") { result.hosxpAvailable = false; result.utilization = null; result.sourceCases = 0; result.emergency = []; result.quality.missingSource = result.totalCases; }
        if (state === "empty") {
          Object.assign(result, { totalCases: 0, sourceCases: 0, doctorCount: 0, averageDurationMinutes: null, durationCases: 0, postponed: 0, cancelled: 0, roomTimeCases: 0, estimatedRoomCases: 0, missingRoomTimes: 0, missingUtilizationTimes: 0 });
          for (const key of ["doctors", "departments", "emergency", "wards", "procedures", "statuses"]) result[key] = [];
          result.series.forEach((row) => { row.cases = 0; });
          for (const key of Object.keys(result.quality)) result.quality[key] = 0;
        }
        return route.fulfill({ json: result });
      });
      await expect(async () => {
        await page.goto((process.argv[2] ?? "http://localhost:50004") + "/or-reg-analytics-check");
        await expect(page.getByRole("heading", { name: "ภาพรวมงานผ่าตัด", exact: true })).toBeVisible();
      }).toPass({ timeout: 30_000 });
      await expect(page.getByRole("heading", { name: "Elective vs Emergency" })).toBeVisible();
      await page.screenshot({ path: resolve(artifacts, "overview-" + viewport.width + "-" + theme + ".png"), fullPage: true });
      assertNoOverflow(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
      await page.getByRole("button", { name: "เปลี่ยนมุมมองทดสอบ" }).click();
      await expect(page.getByRole("heading", { name: "ภาระงานรายแพทย์" })).toBeVisible();
      await expect(page.getByRole("table")).toBeVisible();
      await page.getByRole("button", { name: "แพทย์หน้าถัดไป" }).click();
      await expect(page.getByText("หน้า 2 / 2 · 12 คน")).toBeVisible();
      await page.getByRole("textbox", { name: "ค้นหาแพทย์" }).fill("แพทย์จำลอง 12");
      await expect(page.getByRole("row").filter({ hasText: "แพทย์จำลอง 12" })).toHaveCount(1);
      await page.getByRole("tab", { name: "ห้องและระยะเวลา" }).click();
      await expect(page.getByRole("heading", { name: "การใช้ห้องผ่าตัด · Utilization" })).toBeVisible();
      await page.screenshot({ path: resolve(artifacts, "rooms-" + viewport.width + "-" + theme + ".png"), fullPage: true });
      await page.getByRole("tab", { name: "คุณภาพข้อมูล" }).click();
      await expect(page.getByRole("heading", { name: "เลื่อนและยกเลิก" })).toBeVisible();
      await page.getByRole("combobox", { name: "แผนก", exact: true }).selectOption("02");
      await expect.poll(() => requests.at(-1)?.get("department")).toBe("02");
      await expect(page.getByRole("button", { name: "อัปเดตข้อมูล" })).toBeEnabled();
      state = "outage";
      await page.getByRole("button", { name: "อัปเดตข้อมูล" }).click();
      await expect(page.getByText(/HOSxP ไม่พร้อมใช้งาน/)).toBeVisible();
      state = "empty";
      await page.getByRole("button", { name: "อัปเดตข้อมูล" }).click();
      await expect(page.getByText("ยังไม่มีทะเบียนให้ตรวจความครบถ้วน")).toBeVisible();
      state = "failure";
      await page.getByRole("button", { name: "อัปเดตข้อมูล" }).click();
      await expect(page.getByRole("main").getByRole("alert")).toContainText("โหลดสถิติไม่สำเร็จ");
      assertNoOverflow(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
      await context.close();
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  console.log("Analytics UI passed: 3 viewports × 2 themes; overview, tabs, doctor search/pagination, department requests, empty/outage/error states.");
} finally {
  await browser?.close();
  unlinkSync(resolve(harness, "page.tsx"));
  unlinkSync(resolve(harness, "loading.tsx"));
  rmdirSync(harness);
}
function assertNoOverflow(width) { if (width > 1) throw new Error("Horizontal page overflow: " + width); }
