// Run against the local dev server; all API access is intercepted with synthetic data.
import { chromium, expect } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const harness = resolve(root, "app/or-reg-editor-ui-check");
const marker = "// OR_REG_EDITOR_TEST_ONLY";
const source = `${marker}
"use client";
import { useState } from "react";
import { TimesEditor } from "@/features/operations/components/editors/times-editor";
import { DetailsEditor } from "@/features/operations/components/editors/details-editor";
export default function EditorUICheck() {
  const [view, setView] = useState<string | null>("times");
  return <div className="p-6 pt-72"><button onClick={() => setView("details")}>Open details fixture</button>{view === "times" && <TimesEditor operationId="9001" operationDate="2026-11-07" sourceStartedAt="2026-11-07 09:00:00" sourceEndedAt="2026-11-07 10:00:00" onClose={() => setView(null)} />}{view === "details" && <DetailsEditor operationId="9001" onClose={() => setView(null)} onSaved={() => {}} />}</div>;
}
`;
const artifacts = resolve(root, "test-results/editors");
const baseURL = process.argv[2] ?? "http://localhost:50004";
const errors = [];
let browser;

async function verify(width, theme) {
  const context = await browser.newContext({ viewport: { width, height: 1050 }, colorScheme: theme, locale: "th-TH", timezoneId: "Asia/Bangkok" });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
  const patches = [];
  await page.route("**/api/**", (route) => {
    const request = route.request(); const url = new URL(request.url());
    if (url.pathname === "/api/register/9001/times") {
      if (request.method() === "PATCH") { patches.push(request.postDataJSON()); return route.fulfill({ json: { revision: patches.length } }); }
      return route.fulfill({ json: { revision: 0, roomEnteredAt: null, operationStartedAt: null, operationEndedAt: null, roomExitedAt: null } });
    }
    if (url.pathname === "/api/register/9001/details") return route.fulfill({ json: { revision: 0, patho: false, preOp: false, postOp: false, surgeryClass: null, minorPeriod: null, anesthesia: null, urgency: "EMERGENCY", remark: "" } });
    errors.push(`Unexpected API access blocked: ${url.pathname}`); return route.abort();
  });
  try {
    await page.goto(`${baseURL}/or-reg-editor-ui-check`, { waitUntil: "domcontentloaded" });
    const dialog = page.getByRole("dialog", { name: "แก้ไขเวลา", exact: true });
    await expect(dialog.getByRole("textbox")).toHaveCount(4, { timeout: 20000 });
    await expect(dialog.getByText(/อายุ|ความเร่งด่วน/)).toHaveCount(0);
    await expect(dialog.getByRole("group", { name: "ช่วงเวลาผ่าตัด", exact: true })).toBeVisible();
    await expect(dialog.getByRole("group", { name: "ช่วงเวลาใช้ห้องผ่าตัด", exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "วันที่สำหรับเวลาเริ่มผ่าตัด", exact: true })).toContainText("2569");
    const time = (label) => dialog.getByRole("textbox", { name: `${label} (เวลา)`, exact: true });
    await expect(time("เวลาเริ่มผ่าตัด")).toHaveValue("09:00");
    for (const [label, value] of [["เวลาเริ่มผ่าตัด", "09:15"], ["เวลาผ่าตัดเสร็จ", "10:30"], ["เวลาเข้าห้องผ่าตัด", "08:45"], ["เวลาออกจากห้องผ่าตัด", "11:00"]]) await time(label).fill(value);
    const save = dialog.getByRole("button", { name: "บันทึกเวลา", exact: true });
    await save.click(); await expect.poll(() => patches.length).toBe(1);
    expect(patches[0].times).toEqual({ operationStartedAt: "2026-11-07T09:15", operationEndedAt: "2026-11-07T10:30", roomEnteredAt: "2026-11-07T08:45", roomExitedAt: "2026-11-07T11:00" });
    expect(patches[0]).not.toHaveProperty("ageOverride"); expect(patches[0].times).not.toHaveProperty("ageOverride");
    await dialog.getByRole("button", { name: "คืนค่า HOSxP", exact: true }).first().click();
    await expect(time("เวลาเริ่มผ่าตัด")).toHaveValue("09:00");
    await save.click(); await expect.poll(() => patches.length).toBe(2); expect(patches[1].useHosxpTimes.operationStartedAt).toBe(true);
    await time("เวลาผ่าตัดเสร็จ").fill("08:00"); await save.click();
    await expect(dialog.getByRole("alert")).toContainText("ลำดับเวลาต้องเป็น"); expect(patches.length).toBe(2);
    await time("เวลาผ่าตัดเสร็จ").fill("00:30");
    for (const label of ["เวลาผ่าตัดเสร็จ", "เวลาออกจากห้องผ่าตัด"]) {
      await dialog.getByRole("button", { name: `วันที่สำหรับ${label}`, exact: true }).click();
      await page.getByRole("group", { name: "ปฏิทิน", exact: true }).getByRole("button").filter({ hasText: /^8$/ }).click();
    }
    await time("เวลาออกจากห้องผ่าตัด").fill("00:45");
    await save.click(); await expect.poll(() => patches.length).toBe(3);
    expect(patches[2].times.operationEndedAt).toBe("2026-11-08T00:30"); expect(patches[2].times.roomExitedAt).toBe("2026-11-08T00:45");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await dialog.screenshot({ path: resolve(artifacts, `times-${width}-${theme}.png`) });
    await page.getByRole("button", { name: "ปิดหน้าต่าง", exact: true }).click();
    await page.getByRole("button", { name: "Open details fixture", exact: true }).click();
    const details = page.getByRole("dialog", { name: "ข้อมูลเพิ่มเติม", exact: true });
    await expect(details.getByRole("combobox")).toBeVisible();
    await expect(details.getByText(/ความเร่งด่วน|EMERGENCY|Elective/)).toHaveCount(0);
    await details.screenshot({ path: resolve(artifacts, `details-${width}-${theme}.png`) });
    console.log(`PASS ${width}px ${theme}: source age locked, urgency hidden, grouped Thai dates, time save/restore/validation/cross-midnight`);
  } finally { await context.close(); }
}

try {
  if (existsSync(harness) && !readFileSync(resolve(harness, "page.tsx"), "utf8").startsWith(marker)) throw new Error("Refusing to overwrite an existing route");
  mkdirSync(harness, { recursive: true }); mkdirSync(artifacts, { recursive: true });
  writeFileSync(resolve(harness, "page.tsx"), source);
  writeFileSync(resolve(harness, "loading.tsx"), 'export { OperationsSkeleton as default } from "@/features/operations/components/shared/operations-skeleton";\n');
  browser = await chromium.launch({ channel: "chrome", headless: true });
  for (const width of [390, 834, 1440]) for (const theme of ["light", "dark"]) await verify(width, theme);
  expect(errors).toEqual([]);
} finally {
  await browser?.close();
  if (existsSync(harness) && readFileSync(resolve(harness, "page.tsx"), "utf8").startsWith(marker)) {
    for (const name of ["page.tsx", "loading.tsx"]) if (existsSync(resolve(harness, name))) unlinkSync(resolve(harness, name));
    rmdirSync(harness);
  }
}
