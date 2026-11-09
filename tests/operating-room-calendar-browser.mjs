import { chromium, expect } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const harness = resolve(root, "app", "or-reg-calendar-ui-check");
if (existsSync(harness)) throw new Error("Refusing to overwrite an existing test route");
mkdirSync(harness);
writeFileSync(resolve(harness, "page.tsx"), 'import { OperatingRoomCalendarPage } from "@/features/operations/components/calendar/operating-room-calendar-page";\nexport default function Page() { return <OperatingRoomCalendarPage canEdit />; }\n');
writeFileSync(resolve(harness, "loading.tsx"), 'import { OperatingRoomCalendarSkeleton } from "@/features/operations/components/calendar/operating-room-calendar-skeleton";\nexport default function Loading() { return <OperatingRoomCalendarSkeleton />; }\n');
const artifacts = resolve(root, "test-results", "calendar");
mkdirSync(artifacts, { recursive: true });
const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
const today = `${dateParts.find((part) => part.type === "year").value}-${dateParts.find((part) => part.type === "month").value}-${dateParts.find((part) => part.type === "day").value}`;
const isoBangkok = (hour, minute) => new Date(`${today}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+07:00`).toISOString();
const rooms = [{ id: "1", name: "ห้องผ่าตัด 1" }, { id: "2", name: "ห้องผ่าตัด 2" }, { id: "3", name: "ห้องผ่าตัด 3" }];
const row = (id, roomId, roomName, enter, exit, index) => ({
  operation_id: id, hn: `DEMO-HN-${id}`, ptname: `ผู้ป่วยจำลอง ${index}`, effectiveAge: "40 ปี", ward_name: "Ward จำลอง", request_operation_date: today,
  sourceRoomId: roomId, room_name: roomName, sourceDepartmentId: "DEMO-DEPT", departmentName: "ศัลยกรรมจำลอง", registerNumber: `${index}/11`, needsDateSync: false,
  roomEnteredAt: enter == null ? null : isoBangkok(enter[0], enter[1]), roomExitedAt: exit == null ? null : isoBangkok(exit[0], exit[1]),
  effectiveOperationStartedAt: isoBangkok(enter?.[0] ?? 9, enter?.[1] ?? 0), effectiveOperationEndedAt: isoBangkok(exit?.[0] ?? 10, exit?.[1] ?? 0),
  sourceOperationStartedAt: isoBangkok(9, 0), sourceOperationEndedAt: isoBangkok(10, 0), operationStartedAtEdited: false, operationEndedAtEdited: false,
  emergency_name: index === 2 ? "Emergency" : "Elective", provision_diagnosis: "DEMO-DX", provision_name: "Demo diagnosis", diagnosis_text: "Demo details", wound_names: "Clean wound", surgeryClass: "MAJOR", preOp: true, postOp: false, patho: false, anesthesia: "GA", remark: "",
});
const rows = [row(1001, "1", rooms[0].name, [9, 0], [10, 30], 1), row(1002, "1", rooms[0].name, [10, 0], [11, 0], 2), row(1003, "2", rooms[1].name, null, null, 3)];
const yesterday = new Date(`${today}T12:00:00.000Z`);
yesterday.setUTCDate(yesterday.getUTCDate() - 1);
const previousDay = yesterday.toISOString().slice(0, 10);
rows.push(row(1004, "1", rooms[0].name, null, null, 4));
rows[3].request_operation_date = previousDay;
rows[3].roomEnteredAt = new Date(`${previousDay}T23:30:00+07:00`).toISOString();
rows[3].roomExitedAt = new Date(`${today}T00:45:00+07:00`).toISOString();
rows[3].registerNumber = "4/11";
rows[2].sourceDepartmentId = "DEMO-DEPT-2";
rows[2].departmentName = "แผนกจำลอง B";
const errors = [];
let browser;
const baseURL = process.argv[2] ?? "http://localhost:50004";

async function runViewport(viewport, theme) {
  const context = await browser.newContext({ viewport, colorScheme: theme, locale: "th-TH", timezoneId: "Asia/Bangkok" });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (/Encountered two children with the same key/.test(message.text())) errors.push(message.text()); });
  await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/hosxp/operations") {
      const month = url.searchParams.get("month");
      return route.fulfill({ json: { operations: rows.filter((operation) => operation.request_operation_date.startsWith(month)), rooms } });
    }
    if (/^\/api\/hosxp\/operations\/\d+\/team$/.test(url.pathname)) return route.fulfill({ json: { team: [] } });
    if (/^\/api\/register\/\d+\/times$/.test(url.pathname)) return route.fulfill({ json: { revision: 0, roomEnteredAt: rows[0].roomEnteredAt, operationStartedAt: rows[0].effectiveOperationStartedAt, operationEndedAt: rows[0].effectiveOperationEndedAt, roomExitedAt: rows[0].roomExitedAt } });
    errors.push(`Unexpected API call; real backend access blocked: ${url.pathname}`);
    return route.abort();
  });
  try {
    let response = await page.goto(`${baseURL}/or-reg-calendar-ui-check`, { waitUntil: "domcontentloaded" });
    if (response?.status() === 404) {
      await page.waitForTimeout(2000);
      response = await page.reload({ waitUntil: "domcontentloaded" });
    }
    await expect(page.getByRole("heading", { name: "ปฏิทินห้องผ่าตัด" })).toBeVisible();
    const dayView = page.getByTestId(viewport.width < 768 ? "calendar-day-mobile" : "calendar-day-desktop");
    await expect(dayView).toBeVisible();
    await expect(dayView.getByRole("button", { name: /ผู้ป่วยจำลอง 1/ }).first()).toBeVisible();
    await expect(page.getByText("คิวไม่ระบุเวลา").filter({ visible: true }).first()).toBeVisible();
    await expect(dayView.getByText("เวลาห้องทับซ้อน").filter({ visible: true }).first()).toBeVisible();
    await expect(dayView.getByText("ต่อเนื่องถึง 00:45").filter({ visible: true }).first()).toBeVisible();
    await page.screenshot({ path: resolve(artifacts, `initial-${viewport.width}-${theme}.png`), fullPage: true });
    await expect(dayView).not.toContainText("DEMO-HN-1001");
    await expect(dayView).toContainText("ห้องผ่าตัด 3");
    await page.getByLabel("กรองห้องผ่าตัด").selectOption("1");
    await expect(dayView).toContainText("ผู้ป่วยจำลอง 1");
    await expect(dayView).not.toContainText("ผู้ป่วยจำลอง 3");
    await page.getByLabel("กรองห้องผ่าตัด").selectOption("ALL");
    await page.getByLabel("กรองแผนก").selectOption("DEMO-DEPT-2");
    await expect(page.getByText("ผู้ป่วยจำลอง 3").filter({ visible: true }).first()).toBeVisible();
    await page.getByLabel("กรองแผนก").selectOption("ALL");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "สัปดาห์", exact: true }).click();
    await expect(page.getByTestId("calendar-week")).toBeVisible();
    await expect(page.getByTestId("calendar-week").locator("article")).toHaveCount(7);
    await page.getByRole("button", { name: "เดือน", exact: true }).click();
    await expect(page.getByTestId("calendar-month")).toBeVisible();
    await page.getByRole("button", { name: "วัน", exact: true }).click();
    const eventButton = dayView.getByRole("button", { name: /ผู้ป่วยจำลอง 1/ }).first();
    await eventButton.click();
    await expect(page.getByRole("dialog", { name: "รายละเอียดทะเบียนผ่าตัด" })).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("DEMO-HN-1001");
    await page.getByRole("button", { name: "แก้เวลา", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "แก้ไขเวลา" })).toBeVisible();
    await page.getByRole("button", { name: "ยกเลิก", exact: true }).click();
    await page.screenshot({ path: resolve(artifacts, `calendar-${viewport.width}-${theme}.png`), fullPage: true });
    expect(errors).toEqual([]);
    console.log(`PASS ${viewport.width}px ${theme}: room timeline, unscheduled queue, conflict marker, day/week/month, details, edit times`);
  } catch (error) {
    await page.screenshot({ path: resolve(artifacts, `failure-${viewport.width}-${theme}.png`), fullPage: true }).catch(() => undefined);
    throw error;
  } finally {
    await context.close();
  }
}

try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  for (const viewport of [{ width: 390, height: 844 }, { width: 834, height: 1112 }, { width: 1440, height: 1000 }]) {
    for (const theme of ["light", "dark"]) await runViewport(viewport, theme);
  }
} finally {
  if (browser) await browser.close();
  unlinkSync(resolve(harness, "page.tsx"));
  unlinkSync(resolve(harness, "loading.tsx"));
  rmdirSync(harness);
}
