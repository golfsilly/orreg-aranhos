// Requires the existing local dev server. Every API call is intercepted with synthetic data.
// The temporary page only mounts real feature components; it is removed even on failure.
import { chromium, expect } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { getRegisterColumns } from "../features/operations/lib/register-columns.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const harness = resolve(root, "app", "or-reg-register-ui-check");
if (existsSync(harness)) throw new Error("Refusing to overwrite an existing test page");
const artifacts = resolve(root, "test-results", "operations");
mkdirSync(artifacts, { recursive: true });
const now = new Date();
const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).formatToParts(now);
const month = `${parts.find((part) => part.type === "year").value}-${parts.find((part) => part.type === "month").value}`;
const day = `${month}-07`;
const rows = Array.from({ length: 26 }, (_, index) => ({
  operation_id: 9001 + index, hn: index < 2 ? "DEMO-SAME-HN" : `DEMO-HN-${index}`, ptname: `ผู้ป่วยจำลอง ${index + 1}`, effectiveAge: "30 ปี", sourceAge: "30 ปี", ward_name: "Ward จำลอง", request_operation_date: day,
  sourceDepartmentId: index < 24 ? "DEMO-A" : "DEMO-B", departmentName: index < 24 ? "แผนกจำลอง A" : "แผนกจำลอง B",
  registerNumber: `${index < 24 ? index + 1 : index - 23}/${Number(month.slice(5))}`, needsDateSync: false,
  room_name: "ห้องจำลอง 1", emergency_name: "Elective", effectiveOperationStartedAt: `${day} 09:30:00`, effectiveOperationEndedAt: `${day} 10:30:00`, sourceOperationStartedAt: `${day} 09:00:00`, sourceOperationEndedAt: `${day} 10:00:00`, operationStartedAtEdited: index === 23, operationEndedAtEdited: index === 23,
  provision_diagnosis: "DEMO-DX", provision_name: "วินิจฉัยจำลอง", diagnosis_text: "ข้อมูลจำลองสำหรับทดสอบ", wound_names: "Clean wound", surgeryClass: "MAJOR", preOp: true, postOp: false, patho: false, anesthesia: "GA", remark: "ข้อมูลจำลอง",
}));
// Same staff/position can participate in several operation items. Older API
// responses omit detail IDs, and joined data can also contain exact duplicates.
const teamRows = [1, 2, 5, 8].flatMap((position) => ["A", "B"].map((item) => ({
  position_id: position, doctor: `DEMO-${position}`, doctor_name: `บุคลากรจำลอง ${position}`,
  position_name: `ตำแหน่งจำลอง ${position}`, operation_item_name: `หัตถการจำลอง ${item}`,
  enteredDate: day, enteredTime: "09:00:00", exitedDate: day, exitedTime: "10:00:00",
})));
teamRows.push({ ...teamRows[0] });
const baseURL = process.argv[2] ?? "http://localhost:50004";
const errors = [];
let browser;

async function verify(viewport, theme) {
  const context = await browser.newContext({ viewport, colorScheme: theme, locale: "th-TH", timezoneId: "Asia/Bangkok" });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (/Encountered two children with the same key/.test(message.text())) errors.push(message.text()); });
  await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
  let releaseSync;
  const syncGate = new Promise((resolveGate) => { releaseSync = resolveGate; });
  const apiCalls = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request(); const url = new URL(request.url()); apiCalls.push(`${request.method()} ${url.pathname}`);
    if (url.pathname === "/api/hosxp/operations") return route.fulfill({ json: { operations: rows } });
    if (/^\/api\/hosxp\/operations\/\d+\/team$/.test(url.pathname)) return route.fulfill({ json: { team: teamRows } });
    if (/^\/api\/hosxp\/operations\/\d+\/anesthesia$/.test(url.pathname)) return route.fulfill({ json: { records: [], assessment: null, staff: [] } });
    if (/^\/api\/hosxp\/operations\/\d+\/items$/.test(url.pathname)) return route.fulfill({ json: { operations: [] } });
    if (/^\/api\/register\/\d+\/times$/.test(url.pathname)) return route.fulfill({ json: { revision: 0, roomEnteredAt: null, operationStartedAt: null, operationEndedAt: null, roomExitedAt: null } });
    if (url.pathname === "/api/hosxp/sync/month") { await syncGate; return route.fulfill({ json: { created: 0, renumbered: 0, dateUpdated: 0, departmentUpdated: 0, existing: 26 } }); }
    errors.push(`Unexpected API call; real backend access blocked: ${url.pathname}`);
    return route.abort();
  });
  const mobile = viewport.width < 768;
  const visibleRows = () => mobile ? page.getByTestId("register-card") : page.getByTestId("register-table").locator("tbody tr");
  const columns = () => page.getByTestId("register-table").getByRole("columnheader").allTextContents();
  async function checkHeaders(showDepartment, sourceId = false) {
    if (mobile) {
      await expect(visibleRows().first().locator("dt").first()).toHaveText("จัดการ");
      if (sourceId) await expect(visibleRows().first().getByText("รหัส HOSxP", { exact: true })).toBeVisible();
    } else {
      const expected = getRegisterColumns(showDepartment).filter((column) => column.defaultVisible || sourceId && column.id === "operationId").map((column) => column.label);
      expect(await columns()).toEqual(expected);
    }
  }
  async function openColumns() { await page.locator("summary").click(); }
  async function checkOverflow() { expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); }

  try {
    let response = await page.goto(`${baseURL}/or-reg-register-ui-check`, { waitUntil: "domcontentloaded" });
    if (response?.status() === 404) {
      await page.waitForTimeout(2000);
      response = await page.reload({ waitUntil: "domcontentloaded" });
    }
    await page.getByRole("button", { name: /แผนกจำลอง A/ }).click();
    await expect(visibleRows()).toHaveCount(10);
    await checkHeaders(false); await checkOverflow();
    await expect(page.locator('[aria-label="เวลาเริ่มผ่าถูกแก้ไข"]:visible')).toHaveCount(1);
    await expect(page.locator('[aria-label="เวลาผ่าเสร็จถูกแก้ไข"]:visible')).toHaveCount(1);
    await page.getByLabel("จำนวนรายการต่อหน้า").selectOption("20"); await expect(visibleRows()).toHaveCount(20);
    await page.getByLabel("จำนวนรายการต่อหน้า").selectOption("50"); await expect(visibleRows()).toHaveCount(24);
    await page.getByLabel("จำนวนรายการต่อหน้า").selectOption("10");
    await page.getByRole("button", { name: "หน้าถัดไป", exact: true }).click(); await expect(visibleRows().first()).toContainText(`14/${Number(month.slice(5))}`);
    await openColumns(); await page.getByRole("checkbox", { name: "รหัส HOSxP", exact: true }).check(); await openColumns();
    await checkHeaders(false, true);
    const search = page.getByRole("textbox", { name: "ค้นหาทะเบียนผ่าตัด" });
    await search.fill("9001"); await expect(visibleRows()).toHaveCount(1); await expect(visibleRows().first()).toContainText("9001");
    await search.fill(""); await expect(visibleRows()).toHaveCount(10);
    await openColumns(); await page.getByRole("button", { name: "คืนค่าเริ่มต้น", exact: true }).click(); await openColumns();
    await checkHeaders(false);
    await visibleRows().first().getByRole("button", { name: "ดูและแก้ไขทะเบียน", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "รายละเอียดทะเบียนผ่าตัด" })).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("9024");
    await page.getByRole("tab", { name: "ทีมผ่าตัด" }).click();
    const teamSection = page.getByRole("dialog").getByRole("region", { name: "ตารางทีมผ่าตัดและเวลาเข้าออกห้องผ่าตัด" });
    if (mobile) await expect(page.getByRole("dialog").getByRole("region", { name: "ทีมผ่าตัด" }).locator("article:visible")).toHaveCount(teamRows.length);
    else await expect(teamSection.locator("tbody tr")).toHaveCount(teamRows.length);
    await page.getByRole("button", { name: "แก้เวลา", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "แก้ไขเวลา", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("textbox", { name: "เวลาเริ่มผ่าตัด (เวลา)", exact: true })).toHaveValue("09:00");
    await expect(page.getByRole("dialog").getByText("อายุที่แก้ไข", { exact: false })).toHaveCount(0);
    await expect(page.getByRole("dialog").getByRole("group", { name: "ช่วงเวลาผ่าตัด", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("group", { name: "ช่วงเวลาใช้ห้องผ่าตัด", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "ปิดหน้าต่าง", exact: true }).click();
    await page.getByRole("button", { name: "ปิดหน้าต่าง", exact: true }).click();
    await page.screenshot({ path: resolve(artifacts, `monthly-${viewport.width}-${theme}.png`), fullPage: true });

    await page.getByRole("button", { name: "ซิงก์เดือนนี้ทุกแผนก", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "กำลังซิงก์ทะเบียนทั้งเดือน" })).toBeVisible();
    await page.keyboard.press("Escape"); await expect(page.getByRole("dialog", { name: "กำลังซิงก์ทะเบียนทั้งเดือน" })).toBeVisible();
    releaseSync(); await expect(page.getByRole("dialog", { name: "กำลังซิงก์ทะเบียนทั้งเดือน" })).toBeHidden();
    await page.getByRole("button", { name: /ค้นหารายวัน/ }).click();
    await page.getByRole("button", { name: "เลือกวันที่ผ่าตัด", exact: true }).click();
    await page.getByRole("group", { name: "ปฏิทิน", exact: true }).getByRole("button").filter({ hasText: /^7$/ }).click();
    await page.getByRole("button", { name: "ค้นหา", exact: true }).click();
    await expect(visibleRows()).toHaveCount(10); await checkHeaders(true);
    await expect(page.getByRole("button", { name: "แสดงตัวกรอง", exact: true })).toBeVisible();
    await page.getByRole("button", { name: /แผนกจำลอง A/ }).click(); await checkHeaders(false);
    await page.getByRole("button", { name: /ทุกแผนก/ }).click(); await checkHeaders(true);
    await openColumns(); await page.getByRole("checkbox", { name: "รหัส HOSxP", exact: true }).check(); await openColumns();
    await checkHeaders(true, true);
    await page.getByRole("textbox", { name: "ค้นหาทะเบียนผ่าตัด" }).fill("9002"); await expect(visibleRows()).toHaveCount(1);
    await expect(visibleRows().first()).toContainText("9002"); await checkOverflow();
    await page.screenshot({ path: resolve(artifacts, `daily-${viewport.width}-${theme}.png`), fullPage: true });
    expect(apiCalls.some((call) => call === "POST /api/hosxp/sync/month")).toBe(true);
    expect(errors).toEqual([]);
    console.log(`PASS ${viewport.width}px ${theme}: columns, source ID, pagination, complete team rows without key warnings, detail routing, sync overlay, daily department visibility`);
  } catch (error) {
    releaseSync(); await page.screenshot({ path: resolve(artifacts, `failure-${viewport.width}-${theme}.png`), fullPage: true }); throw error;
  } finally { await context.close(); }
}

try {
  mkdirSync(harness);
  writeFileSync(resolve(harness, "page.tsx"), 'import { OperationsWorkspace } from "@/features/operations/components/operations-workspace";\nexport default function RegisterUICheck() { return <div className="mx-auto max-w-[1440px] p-4 sm:p-7"><OperationsWorkspace canSync /></div>; }\n');
  writeFileSync(resolve(harness, "loading.tsx"), 'export { OperationsSkeleton as default } from "@/features/operations/components/shared/operations-skeleton";\n');
  browser = await chromium.launch({ channel: "chrome", headless: true });
  for (const viewport of [{ width: 390, height: 844 }, { width: 834, height: 1112 }, { width: 1440, height: 1000 }]) for (const theme of ["light", "dark"]) await verify(viewport, theme);
  expect(errors).toEqual([]);
} finally {
  await browser?.close();
  for (const name of ["page.tsx", "loading.tsx"]) if (existsSync(resolve(harness, name))) unlinkSync(resolve(harness, name));
  if (existsSync(harness)) rmdirSync(harness);
}
