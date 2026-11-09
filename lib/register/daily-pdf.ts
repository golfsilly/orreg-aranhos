import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { DailyRegisterRow } from "./daily-export-data";

const thaiDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
};
const shortTime = (value: string | null) => value ? value.replace("T", " ").slice(11, 16) : "—";

/** Creates a print-friendly register; page breaks are measured from wrapped Thai text. */
async function createRegisterPdf(rows: DailyRegisterRow[], title: string, periodLabel: string): Promise<Buffer> {
  const fontDir = path.join(process.cwd(), "assets", "fonts", "sarabun");
  const [regular, bold] = await Promise.all([
    readFile(path.join(fontDir, "Sarabun-Regular.ttf")),
    readFile(path.join(fontDir, "Sarabun-Bold.ttf")),
  ]);
  const doc = new PDFDocument({ size: "A4", margin: 34, bufferPages: true, info: { Title: title } });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.registerFont("Sarabun", regular).registerFont("Sarabun-Bold", bold);
  const left = 34, width = doc.page.width - 68, bottom = doc.page.height - 36;
  const green = "#126044", dark = "#17362b", muted = "#61766b", border = "#dce8df";
  const heading = () => {
    doc.rect(0, 0, doc.page.width, 8).fill(green);
    doc.fillColor(green).font("Sarabun-Bold").fontSize(11).text("OR-Reg  /  ทะเบียนผ่าตัด", left, 22, { lineBreak: false });
    doc.fillColor(dark).fontSize(20).text(title, left, 41, { lineBreak: false });
    doc.fillColor(muted).font("Sarabun").fontSize(10).text(`${periodLabel}  ·  ${rows.length.toLocaleString("th-TH")} รายการ`, left, 70, { lineBreak: false });
    doc.moveTo(left, 91).lineTo(left + width, 91).strokeColor(border).stroke();
  };
  heading();
  let y = 101;
  rows.forEach((row, index) => {
    const diagnosis = `Diagnosis: ${row.diagnosis || "—"}`;
    const roomAndWound = `ห้องผ่าตัด: ${row.room || "—"}  ·  ลักษณะแผล: ${row.woundNames || "—"}`;
    const remarkText = `หมายเหตุ: ${row.remark || "—"}`;
    const textWidth = width - 24;
    doc.font("Sarabun").fontSize(9);
    const sections = [roomAndWound, diagnosis, remarkText, `ทีมผ่าตัด: ${row.team || "—"}`];
    const contentHeight = sections.reduce((height, section) => height + doc.heightOfString(section, { width: textWidth }) + 3, 0);
    const cardHeight = Math.max(110, 78 + contentHeight + 10);
    if (y + cardHeight > bottom) { doc.addPage(); heading(); y = 101; }
    doc.roundedRect(left, y, width, cardHeight, 7).lineWidth(0.7).strokeColor(border).stroke();
    doc.roundedRect(left, y, 62, 27, 7).fill("#edf6ef");
    doc.fillColor(green).font("Sarabun-Bold").fontSize(11).text(row.registerNumber, left + 9, y + 6, { width: 46, lineBreak: false });
    doc.fillColor(dark).font("Sarabun-Bold").fontSize(11).text(row.name || "ไม่ระบุชื่อ", left + 75, y + 6, { width: width - 90, lineBreak: false, ellipsis: true });
    doc.fillColor(muted).font("Sarabun").fontSize(9).text(`แผนก ${row.departmentName || "ไม่ระบุแผนก"}  ·  HN ${row.hn || "—"}  ·  อายุ ${row.age || "—"}  ·  ${row.ward || "ไม่ระบุ Ward"}  ·  ${row.urgency || "ไม่ระบุความเร่งด่วน"}`, left + 12, y + 34, { width: textWidth, lineBreak: false, ellipsis: true });
    doc.fillColor(dark).font("Sarabun").fontSize(9).text(`เริ่มผ่า ${shortTime(row.startedAt)}  ·  ผ่าเสร็จ ${shortTime(row.endedAt)}  ·  ${row.surgeryClass === "MAJOR" ? "ผ่าตัดใหญ่" : row.surgeryClass === "MINOR" ? `ผ่าตัดเล็ก${row.minorPeriod ? ` (${row.minorPeriod === "OFFICIAL_HOURS" ? "ในเวลาราชการ" : "นอกเวลาราชการ"})` : ""}` : "ไม่ระบุประเภท"}  ·  ดมยา ${row.anesthesia || "—"}`, left + 12, y + 49, { width: textWidth, lineBreak: false, ellipsis: true });
    doc.fillColor(dark).font("Sarabun").fontSize(9).text(`Pre-op [${row.preOp ? "x" : " "}]    Post-op [${row.postOp ? "x" : " "}]    Patho [${row.patho ? "x" : " "}]`, left + 12, y + 64, { width: textWidth, lineBreak: false });
    let textY = y + 79;
    for (const [index, section] of sections.entries()) {
      doc.fillColor(index === 0 || index === 1 ? dark : muted).font("Sarabun").fontSize(9).text(section, left + 12, textY, { width: textWidth });
      textY += doc.heightOfString(section, { width: textWidth }) + 3;
    }
    y += cardHeight + 8;
    if (index === rows.length - 1 && y <= bottom - 10) doc.moveTo(left, y).lineTo(left + width, y).strokeColor(border).stroke();
  });
  if (!rows.length) doc.fillColor(muted).font("Sarabun").fontSize(11).text("ไม่พบรายการผ่าตัดในวันที่เลือก", left, y + 12);
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i += 1) {
    doc.switchToPage(i);
    doc.fillColor(muted).font("Sarabun").fontSize(8).text(`หน้า ${i + 1} / ${pages.count}`, left, doc.page.height - 25, { width, align: "right", lineBreak: false });
  }
  doc.end();
  return result;
}

/** Creates a print-friendly daily register PDF. */
export async function createDailyRegisterPdf(rows: DailyRegisterRow[], day: string): Promise<Buffer> {
  return createRegisterPdf(rows, "ทะเบียนผ่าตัดประจำวัน", thaiDate(day));
}

/** Creates a print-friendly monthly register PDF. */
export async function createMonthlyRegisterPdf(rows: DailyRegisterRow[], month: string): Promise<Buffer> {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year!, monthNumber! - 1, 15, 12));
  const label = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(date);
  return createRegisterPdf(rows, "ทะเบียนผ่าตัดประจำเดือน", label);
}

