// Render the real Flex payload with synthetic data only. No API calls or sends.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "test-results/notification-card");
mkdirSync(output, { recursive: true });
function load(file, dependencies = {}, extra = "") {
  const code = ts.transpileModule(readFileSync(resolve(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", `${code}\n${extra}`)((id) => {
    if (!(id in dependencies)) throw new Error(`Unexpected preview dependency: ${id}`);
    return dependencies[id];
  }, mod, mod.exports);
  return mod.exports;
}
const brand = load("lib/brand.ts");
const { render } = load("lib/notifications/set-or-message.ts", {
  "@/lib/brand": brand, "server-only": {}, "./set-or-response": {},
}, "module.exports.render = oneOperationMessage;");
const logo = `data:image/png;base64,${readFileSync(resolve(root, "public/or-reg-logo/logo.png")).toString("base64")}`;
const base = {
  request_day: "2026-11-17", request_time: "08:15:00",
  request_operation_date: "2026-11-18", request_operation_time: "09:30:00",
  patient_name: "ผู้ป่วยตัวอย่าง สำหรับทดสอบ", hn: "DEMO-0001", age_text: "42 ปี 3 เดือน",
  chronic_disease: "ปฏิเสธ", patient_drug_allergy: "ปฏิเสธการแพ้ยา",
  department_name: "ศัลยกรรม", ward_name: "หอผู้ป่วยศัลยกรรม", patient_bed_number: "A-12",
  opdscreen_weight: 62, opdscreen_height: 165, preop_npo_date: "2026-11-18", preop_npo_time: "00:00:00",
  request_doctor_name: "แพทย์ตัวอย่าง สำหรับทดสอบ", operation_list_anes_type_id: 1,
  dx_note: "ข้อความวินิจฉัยตัวอย่างสำหรับตรวจรูปแบบ", note: "เตรียมอุปกรณ์ตามแผนการผ่าตัด",
  requested_procedures: [{ operation_name: "MRM", operation_position: "BREAST", operation_side: "ขวา" }],
};
const fixtures = {
  regular: base,
  oncall: { ...base, request_operation_time: "00:00:00", preop_on_call: "Y", requested_procedures: [
    { operation_name: "Low transverse caesarean section", operation_position: "ABDOMEN", operation_side: "-" },
    { operation_name: "Additional procedure for layout verification", operation_position: "ABDOMEN", operation_side: "-" },
  ] },
  long: { ...base, preop_on_call: "Y", ward_name: "หอผู้ป่วยตัวอย่างชื่อยาว ชั้น 6 อาคารผู้ป่วยสำหรับทดสอบการตัดบรรทัด",
    patient_name: "ชื่อผู้ป่วยสมมติยาวสำหรับทดสอบ นามสกุลสมมติสำหรับทดสอบ",
    age_text: "59 ปี 2 เดือน 28 วัน",
    request_doctor_name: "แพทย์สมมติชื่อยาว นามสกุลสมมติสำหรับตรวจการแสดงผล",
    patient_drug_allergy: "DEMO-DRUG-A, DEMO-DRUG-B, DEMO-DRUG-C",
    dx_note: "วินิจฉัยตัวอย่างบรรทัดที่หนึ่ง\nวินิจฉัยตัวอย่างบรรทัดที่สอง มีรายละเอียดเพิ่มเติมเพื่อทดสอบการแสดงข้อความยาว",
    note: "หมายเหตุตัวอย่างบรรทัดแรก\nหมายเหตุตัวอย่างบรรทัดที่สอง ข้อมูลทั้งหมดในภาพนี้เป็นข้อมูลสมมติ",
  },
  empty: {},
};
const escape = (text) => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const sizes = { xxs: 11, xs: 13, sm: 14, md: 16, lg: 19 };
const spaces = { none: 0, xs: 4, sm: 8, md: 12, lg: 16 };
function renderNode(node) {
  const css = ["min-width:0", "box-sizing:border-box"];
  if (node.margin) css.push(`margin-top:${spaces[node.margin] ?? 0}px`);
  if (node.backgroundColor) css.push(`background:${node.backgroundColor}`);
  if (node.cornerRadius) css.push(`border-radius:${node.cornerRadius}`);
  if (node.paddingAll) css.push(`padding:${node.paddingAll}`);
  if (node.width) css.push(`width:${node.width}`, "flex-shrink:0");
  if (node.height) css.push(`height:${node.height}`);
  if (node.flex !== undefined) css.push(`flex:${node.flex} 1 0%`);
  if (node.type === "separator") return `<div style="${css.join(";")};border-top:1px solid ${node.color}"></div>`;
  if (node.type === "image") return `<img alt="OR-Reg" src="${logo}" style="width:100%;height:100%;object-fit:contain">`;
  if (node.type === "text") {
    css.push(`font-size:${sizes[node.size] ?? 14}px`, `font-weight:${node.weight === "bold" ? 600 : 400}`, `color:${node.color}`, `text-align:${node.align === "end" ? "right" : node.align === "center" ? "center" : "left"}`, "line-height:1.5", "white-space:pre-wrap", "overflow-wrap:anywhere");
    return `<div style="${css.join(";")}">${escape(node.text)}</div>`;
  }
  css.push("display:flex", `flex-direction:${node.layout === "horizontal" ? "row" : "column"}`, `gap:${spaces[node.spacing] ?? 0}px`);
  if (node.alignItems) css.push(`align-items:${node.alignItems}`);
  if (node.justifyContent) css.push(`justify-content:${node.justifyContent}`);
  return `<div style="${css.join(";")}">${(node.contents ?? []).map(renderNode).join("")}</div>`;
}
const fonts = [400, 600].flatMap((weight) => ["thai", "latin"].map((subset) => {
  const data = readFileSync(resolve(root, `node_modules/@fontsource/sarabun/files/sarabun-${subset}-${weight}-normal.woff2`)).toString("base64");
  const range = subset === "thai" ? "U+0E00-0E7F" : "U+0000-00FF";
  return `@font-face{font-family:Sarabun;src:url(data:font/woff2;base64,${data});font-weight:${weight};unicode-range:${range};font-display:block}`;
})).join("");
function html(card) {
  return `<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OR-Reg · ตัวอย่างการ์ดแจ้งเตือน</title><style>${fonts}body{margin:0;padding:14px;background:#E9EEEB;font-family:Sarabun,sans-serif}article{background:white;border:1px solid #DCE4DF;border-radius:18px;overflow:hidden;box-shadow:0 5px 20px #133D3010}aside{color:#63766F;font-size:11px;text-align:center;margin-top:10px}</style><article>${[card.contents.header, card.contents.body, card.contents.footer].map(renderNode).join("")}</article><aside>ภาพจำลองจากข้อมูลสมมติ · ไม่ได้ส่งข้อความจริง</aside></html>`;
}
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const checks = [];
  for (const [name, row] of Object.entries(fixtures)) {
    const card = render(row, "https://example.invalid/preview-logo.png");
    const document = html(card);
    writeFileSync(resolve(output, `${name}.html`), document, "utf8");
    for (const width of [320, 360, 420]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      await page.route("**/*", (route) => route.abort());
      await page.setContent(document);
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        clippedText: [...document.querySelectorAll("article div")].filter((node) => node.childElementCount === 0 && node.scrollWidth > node.clientWidth + 1).length,
        height: document.querySelector("article").getBoundingClientRect().height,
      }));
      if (result.overflow || result.clippedText) throw new Error(`Preview overflow: ${name} at ${width}px`);
      await page.screenshot({ path: resolve(output, `${name}-${width}.png`), fullPage: true });
      checks.push({ fixture: name, width, ...result });
      await page.close();
    }
  }
  console.log(JSON.stringify(checks));
  console.log(`Synthetic previews: ${output}`);
} finally { await browser.close(); }
