import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { DailyRegisterRow } from "./daily-export-data";

type AnesthesiaData = {
  records: Record<string, unknown>[];
  assessment: Record<string, unknown> | null;
  staff: Record<string, unknown>[];
};

const display = (value: unknown, fallback = "—") =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim() || fallback
    : fallback;

const thaiDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "long",
    timeZone: "Asia/Bangkok",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
};

const thaiDateTime = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    }).format(value);
  }
  if (typeof value !== "string" || !value.trim()) return "—";
  const match = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::\d{2})?)?$/.exec(value.trim());
  if (!match) return value;
  return `${thaiDate(match[1]!)}${match[2] ? ` ${match[2]} น.` : ""}`;
};

const clock = (value: string | null) => {
  if (!value) return "—";
  return /(\d{2}:\d{2})(?::\d{2})?$/.exec(value)?.[1] ?? value;
};

export async function createSingleRegisterPdf(
  row: DailyRegisterRow,
  operationItems: string[],
  anesthesia: AnesthesiaData,
): Promise<Buffer> {
  const fontDir = path.join(process.cwd(), "assets", "fonts", "sarabun");
  const [regular, bold, logo] = await Promise.all([
    readFile(path.join(fontDir, "Sarabun-Regular.ttf")),
    readFile(path.join(fontDir, "Sarabun-Bold.ttf")),
    readFile(path.join(process.cwd(), "public", "aranhos-logo", "logo-aranhos.png")),
  ]);
  const doc = new PDFDocument({
    size: "A4",
    margin: 38,
    bufferPages: true,
    info: { Title: `ทะเบียนผ่าตัด ${row.registerNumber}` },
  });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.registerFont("Sarabun", regular).registerFont("Sarabun-Bold", bold);

  const left = 38;
  const width = doc.page.width - 76;
  const bottom = doc.page.height - 54;
  const colors = {
    green: "#176c50",
    greenDark: "#124a39",
    pale: "#eef5f0",
    ink: "#1d3028",
    muted: "#64786d",
    line: "#d9e5dc",
    white: "#ffffff",
  };
  let y = 0;

  const drawHeader = () => {
    doc.rect(0, 0, doc.page.width, 7).fill(colors.green);
    doc.image(logo, left, 18, { fit: [52, 52] });
    doc.fillColor(colors.greenDark).font("Sarabun-Bold").fontSize(15)
      .text("โรงพยาบาลอรัญประเทศ", left + 64, 23, { lineBreak: false });
    doc.fillColor(colors.muted).font("Sarabun").fontSize(9)
      .text("ARANYAPRATHET HOSPITAL  ·  OR-REG", left + 64, 45, { lineBreak: false });
    doc.roundedRect(doc.page.width - left - 137, 22, 137, 38, 8).fill(colors.pale);
    doc.fillColor(colors.muted).font("Sarabun").fontSize(8)
      .text("เลขทะเบียนผ่าตัด", doc.page.width - left - 127, 25, { lineBreak: false });
    doc.fillColor(colors.green).font("Sarabun-Bold").fontSize(15)
      .text(row.registerNumber, doc.page.width - left - 127, 38, { lineBreak: false });
    doc.moveTo(left, 80).lineTo(left + width, 80).lineWidth(1).strokeColor(colors.line).stroke();
    doc.fillColor(colors.ink).font("Sarabun-Bold").fontSize(17)
      .text("แบบบันทึกทะเบียนผ่าตัดรายกรณี", left, 88, { lineBreak: false });
    doc.fillColor(colors.muted).font("Sarabun").fontSize(9)
      .text(`พิมพ์เมื่อ ${new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date())}`, left, 114, { lineBreak: false });
    y = 138;
  };

  const nextPageIfNeeded = (height: number) => {
    if (y + height <= bottom) return;
    doc.addPage();
    drawHeader();
  };

  const section = (title: string) => {
    nextPageIfNeeded(40);
    doc.roundedRect(left, y, width, 22, 5).fill(colors.greenDark);
    doc.fillColor(colors.white).font("Sarabun-Bold").fontSize(10)
      .text(title, left + 10, y + 4, { lineBreak: false });
    y += 30;
  };

  const fieldGrid = (fields: Array<[string, string]>) => {
    const gap = 9;
    const columns = 2;
    const cellWidth = (width - gap) / columns;
    doc.font("Sarabun").fontSize(10);
    for (let index = 0; index < fields.length; index += columns) {
      const group = fields.slice(index, index + columns);
      const heights = group.map(([, value]) => Math.max(47, doc.heightOfString(value, { width: cellWidth - 20 }) + 31));
      const height = Math.max(...heights);
      nextPageIfNeeded(height + 7);
      group.forEach(([label, value], position) => {
        const x = left + position * (cellWidth + gap);
        doc.roundedRect(x, y, cellWidth, height, 7).fill(colors.pale);
        doc.fillColor(colors.muted).font("Sarabun-Bold").fontSize(8)
          .text(label, x + 10, y + 6, { width: cellWidth - 20, lineBreak: false, ellipsis: true });
        doc.fillColor(colors.ink).font("Sarabun").fontSize(10)
          .text(value, x + 10, y + 19, { width: cellWidth - 20, height: height - 23, lineGap: 1 });
      });
      y += height + 7;
    }
  };

  const textBlock = (value: string, indent = 0) => {
    const blockWidth = width - indent;
    doc.font("Sarabun").fontSize(10);
    const height = Math.max(16, doc.heightOfString(value, { width: blockWidth - 20 }));
    nextPageIfNeeded(height + 14);
    doc.roundedRect(left + indent, y, blockWidth, height + 12, 6).fill("#f8faf8");
    doc.fillColor(colors.ink).text(value, left + indent + 10, y + 6, { width: blockWidth - 20 });
    y += height + 18;
  };

  drawHeader();
  section("ข้อมูลผู้ป่วยและการผ่าตัด");
  fieldGrid([
    ["ชื่อผู้ป่วย", row.name || "ไม่ระบุชื่อ"],
    ["HN", row.hn || "—"],
    ["อายุ", row.age || "—"],
    ["วันที่ผ่าตัด", thaiDate(row.operationDate)],
    ["แผนก", row.departmentName || "ไม่ระบุแผนก"],
    ["Ward", row.ward || "—"],
    ["ห้องผ่าตัด", row.room || "—"],
    ["ความเร่งด่วน", row.urgency || "—"],
  ]);

  section("รายละเอียดการผ่าตัด");
  if (operationItems.length) {
    for (const [index, operation] of operationItems.entries()) {
      textBlock(`${index + 1}. ${operation}`);
    }
  } else {
    textBlock("ไม่พบรายการ Operation จาก HOSxP");
  }
  fieldGrid([
    ["เวลาเริ่มผ่า", `${thaiDate(row.startedAt?.slice(0, 10) || row.operationDate)} · ${clock(row.startedAt)} น.`],
    ["เวลาผ่าเสร็จ", `${thaiDate(row.endedAt?.slice(0, 10) || row.operationDate)} · ${clock(row.endedAt)} น.`],
    ["Diagnosis", row.diagnosis || "ยังไม่ได้บันทึก"],
    ["ลักษณะแผล", row.woundNames || "—"],
    ["ประเภทผ่าตัด", row.surgeryClass === "MAJOR" ? "ผ่าตัดใหญ่" : row.surgeryClass === "MINOR" ? `ผ่าตัดเล็ก · ${row.minorPeriod === "OFFICIAL_HOURS" ? "ในเวลาราชการ" : row.minorPeriod === "OUTSIDE_HOURS" ? "นอกเวลาราชการ" : "ไม่ระบุช่วงเวลา"}` : "—"],
    ["ชนิดการดมยา", row.anesthesia || "—"],
    ["การติดตาม", `Pre-op: ${row.preOp ? "บันทึกแล้ว" : "ไม่บันทึก"} · Post-op: ${row.postOp ? "บันทึกแล้ว" : "ไม่บันทึก"} · Patho: ${row.patho ? "บันทึกแล้ว" : "ไม่บันทึก"}`],
    ["หมายเหตุ", row.remark || "—"],
  ]);

  section("ทีมผ่าตัด");
  const surgicalStaff = row.team?.split(/\s+\|\s+/).filter(Boolean) ?? [];
  if (surgicalStaff.length) surgicalStaff.forEach((member, index) => textBlock(`${index + 1}. ${member}`));
  else textBlock("ไม่พบข้อมูลทีมผ่าตัด");

  section("ข้อมูลวิสัญญีจาก HOSxP");
  if (anesthesia.assessment) {
    const assessment = anesthesia.assessment;
    fieldGrid([
      ["Physical status", display(assessment.physical_status)],
      ["ASA", display(assessment.asa_name)],
      ["ASA No. / Depth", `${display(assessment.asa_no)} / ${display(assessment.asa_depth)}`],
      ["LV Grade", `${display(assessment.lv_grade)}${assessment.lv_grade_sub ? ` · ${display(assessment.lv_grade_sub)}` : ""}`],
      ["Technique 1", display(assessment.technique1_name)],
      ["Technique 2", display(assessment.technique2_name)],
      ["วิสัญญีแพทย์", display(assessment.anesthesiologist)],
    ]);
  }
  for (const record of anesthesia.records) {
    textBlock(`${display(record.anesthesia_name)} · ${thaiDateTime(record.begin_date_time)} – ${thaiDateTime(record.end_date_time)}${record.df_price == null ? "" : ` · ${display(record.df_price)} บาท`}`);
  }
  for (const member of anesthesia.staff) {
    textBlock(`${display(member.doctor_name)} · ${display(member.position_name, "ไม่ระบุตำแหน่ง")}`);
  }
  if (!anesthesia.assessment && !anesthesia.records.length && !anesthesia.staff.length) {
    textBlock("ไม่พบข้อมูลวิสัญญีใน HOSxP");
  }

  const pages = doc.bufferedPageRange();
  for (let index = 0; index < pages.count; index += 1) {
    doc.switchToPage(index);
    doc.moveTo(left, doc.page.height - 39).lineTo(left + width, doc.page.height - 39).lineWidth(0.7).strokeColor(colors.line).stroke();
    doc.fillColor(colors.muted).font("Sarabun").fontSize(8)
      .text("เอกสารจากระบบ OR-Reg · ใช้เพื่อการปฏิบัติงานภายในโรงพยาบาล", left, doc.page.height - 31, { lineBreak: false });
    doc.text(`หน้า ${index + 1} / ${pages.count}`, left, doc.page.height - 31, { width, align: "right", lineBreak: false });
  }
  doc.end();
  return result;
}
