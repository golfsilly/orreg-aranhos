// Uses only synthetic fixtures; API access is blocked and the temporary route is removed.
import { chromium, expect } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, rmdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const harness = resolve(root, "app/or-reg-team-ui-check");
const marker = "// OR_REG_TEAM_TEST_ONLY";
const artifacts = resolve(root, "test-results/team");
const baseURL = process.argv[2] ?? "http://localhost:50004";
const positions = [1, 5, 2, 3, 4, 6, 7, 8];
const team = positions.map((position_id) => ({ position_id, doctor: `DEMO-${position_id}`, doctor_name: `บุคลากรจำลอง ${position_id}`, position_name: `ตำแหน่งจำลอง ${position_id}`, operation_item_name: "หัตถการจำลอง A", enteredDate: "2026-11-07", enteredTime: "09:00:00", exitedDate: "2026-11-07", exitedTime: "10:00:00" }));
team.push({ ...team[0], operation_item_name: "หัตถการจำลอง B" }, { ...team[0] }, { ...team[0], position_id: 99, doctor: "DEMO-UNKNOWN", doctor_name: "บุคลากรตำแหน่งอื่น" });
const source = `${marker}\nimport { OperationTeamDisplay } from "@/features/operations/components/shared/operation-team-display";\nexport default function TeamUICheck() { return <div className="mx-auto max-w-6xl p-4 sm:p-6"><h1 className="mb-5 text-xl font-semibold">Operation และทีมผ่าตัด</h1><OperationTeamDisplay team={${JSON.stringify(team)}} /></div>; }\n`;
const errors = [];
let browser;

async function verify(width, theme) {
  const context = await browser.newContext({ viewport: { width, height: 1050 }, colorScheme: theme, locale: "th-TH" });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (/Encountered two children with the same key/.test(message.text())) errors.push(message.text()); });
  await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
  await page.route("**/api/**", (route) => { errors.push("Unexpected API access blocked"); return route.abort(); });
  const rows = (scope = page) => width < 768 ? scope.locator("article:visible") : scope.locator("tbody tr:visible");
  try {
    const response = await page.goto(`${baseURL}/or-reg-team-ui-check`, { waitUntil: "domcontentloaded" });
    // A recreated fixture route can briefly retain its prior 404 during dev discovery.
    if (response?.status() === 404) { await page.waitForTimeout(2000); await page.reload({ waitUntil: "domcontentloaded" }); }
    const combined = page.getByRole("tab", { name: "แบบรวม", exact: true });
    const grouped = page.getByRole("tab", { name: "แบ่ง 5 กลุ่ม", exact: true });
    await expect(combined).toHaveAttribute("aria-selected", "true", { timeout: 15000 });
    await expect(rows()).toHaveCount(team.length);
    await page.screenshot({ path: resolve(artifacts, `combined-${width}-${theme}.png`), fullPage: true });
    await grouped.click(); await expect(grouped).toHaveAttribute("aria-selected", "true");
    const groups = ["ผู้ทำการผ่าตัด", "Scrub Nurse", "Instrument Nurse", "Circulate Nurse", "ทีมช่วยผ่าตัด"];
    const counts = [3, 1, 1, 1, 4];
    for (const [index, name] of groups.entries()) {
      const group = page.getByRole("region", { name: `กลุ่ม ${index + 1} ${name}`, exact: true });
      await expect(group).toBeVisible(); await expect(rows(group)).toHaveCount(counts[index]);
      if (width >= 768) await expect(group.locator("tbody tr").first().locator("td").first()).toHaveText("1");
    }
    const helpers = page.getByRole("region", { name: "กลุ่ม 5 ทีมช่วยผ่าตัด", exact: true });
    await expect(helpers.getByText("Swab Count Nurse · Nurse Aid · คนงาน · พนักงานห้องผ่าตัด", { exact: true })).toBeVisible();
    await expect(rows(page.getByRole("region", { name: "ตำแหน่งที่ยังไม่จัดกลุ่ม", exact: true }))).toHaveCount(1);
    await expect(rows()).toHaveCount(team.length);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: resolve(artifacts, `grouped-${width}-${theme}.png`), fullPage: true });
    await grouped.focus(); await page.keyboard.press("ArrowLeft");
    await expect(combined).toHaveAttribute("aria-selected", "true"); await expect(rows()).toHaveCount(team.length);
    console.log(`PASS ${width}px ${theme}: combined/grouped views, five-position mapping, all assignments, unknown positions, keyboard switching`);
  } finally { await context.close(); }
}

try {
  if (existsSync(harness)) throw new Error("Refusing to overwrite an existing test route");
  mkdirSync(harness); mkdirSync(artifacts, { recursive: true });
  writeFileSync(resolve(harness, "page.tsx"), source);
  writeFileSync(resolve(harness, "loading.tsx"), 'export { TeamSkeleton as default } from "@/features/operations/components/shared/operations-skeleton";\n');
  browser = await chromium.launch({ channel: "chrome", headless: true });
  for (const width of [390, 834, 1440]) for (const theme of ["light", "dark"]) await verify(width, theme);
  expect(errors).toEqual([]);
} finally {
  await browser?.close();
  if (existsSync(resolve(harness, "page.tsx")) && readFileSync(resolve(harness, "page.tsx"), "utf8").startsWith(marker)) {
    for (const name of ["page.tsx", "loading.tsx"]) if (existsSync(resolve(harness, name))) unlinkSync(resolve(harness, name));
    rmdirSync(harness);
  }
}
