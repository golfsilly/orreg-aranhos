import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { yearlyReport } from "./reports";

type Report = Awaited<ReturnType<typeof yearlyReport>>;
type Row = { name: string; count: number };

/** The fonts are bundled with the server so PDFs remain readable on other machines. */
export async function createYearlyReportPdf(report: Report, generatedAt = new Date()): Promise<Buffer> {
  const fontDir = path.join(process.cwd(), "assets", "fonts", "sarabun");
  const [regular, bold] = await Promise.all([
    readFile(path.join(fontDir, "Sarabun-Regular.ttf")),
    readFile(path.join(fontDir, "Sarabun-Bold.ttf")),
  ]);
  const doc = new PDFDocument({ size: "A4", margin: 38, info: { Title: `Surgery report ${report.fiscalYear}` } });
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.registerFont("Sarabun", regular).registerFont("Sarabun-Bold", bold);
  const green = "#126044", dark = "#17362b", muted = "#6c8076", border = "#dce8df";
  const left = 38, width = doc.page.width - 76, gap = 18, col = (width - gap) / 2;
  const format = (n: number) => n.toLocaleString("th-TH");

  doc.rect(0, 0, doc.page.width, 9).fill(green);
  doc.fillColor(green).font("Sarabun-Bold").fontSize(10).text("SURGIS ARANHOS  /  รายงานสรุป", left, 34, { lineBreak: false });
  doc.fillColor(dark).fontSize(23).text("สถิติการผ่าตัด", left, 53, { lineBreak: false });
  doc.fillColor(muted).font("Sarabun").fontSize(11).text(`ปีงบประมาณ ${report.fiscalYear}  •  ตุลาคม – กันยายน`, left, 85, { lineBreak: false });
  const date = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(generatedAt);
  doc.text(`จัดทำ ${date} น.`, left, 104, { lineBreak: false });

  doc.roundedRect(left, 132, width, 64, 9).fill("#edf6ef");
  doc.fillColor(green).font("Sarabun-Bold").fontSize(12).text("จำนวนทะเบียนผ่าตัดทั้งหมด", left + 16, 144, { lineBreak: false });
  doc.font("Sarabun").fontSize(10).fillColor(muted).text("ในปีงบประมาณที่เลือก", left + 16, 165, { lineBreak: false });
  doc.font("Sarabun-Bold").fontSize(24).fillColor(dark).text(`${format(report.total)} ราย`, left + 245, 145, { width: width - 261, align: "right", lineBreak: false });

  function table(x: number, y: number, title: string, rows: Row[]) {
    const heading = 28, rowHeight = 19, height = heading + rows.length * rowHeight;
    doc.roundedRect(x, y, col, height, 6).lineWidth(0.7).strokeColor(border).stroke();
    doc.fillColor(green).font("Sarabun-Bold").fontSize(11).text(title, x + 10, y + 7, { width: col - 20, lineBreak: false });
    doc.moveTo(x, y + heading).lineTo(x + col, y + heading).strokeColor(border).stroke();
    rows.forEach((row, index) => {
      const rowY = y + heading + index * rowHeight;
      if (index) doc.moveTo(x + 10, rowY).lineTo(x + col - 10, rowY).strokeColor("#edf2ee").stroke();
      doc.fillColor(dark).font("Sarabun").fontSize(10).text(row.name, x + 10, rowY + 3, { width: col - 68, lineBreak: false });
      doc.font("Sarabun-Bold").text(format(row.count), x + col - 55, rowY + 3, { width: 45, align: "right", lineBreak: false });
    });
    return y + height;
  }

  const y = 214, right = left + col + gap;
  const monthlyEnd = table(left, y, "จำนวนผ่าตัดรายเดือน", report.months);
  let rightEnd = table(right, y, "ประเภทผ่าตัด", report.surgeryClass);
  rightEnd = table(right, rightEnd + 12, "ช่วงเวลาผ่าตัดเล็ก", report.minorPeriod);
  rightEnd = table(right, rightEnd + 12, "ความเร่งด่วน", report.urgency);
  const lowerY = Math.max(monthlyEnd, rightEnd) + 15;
  table(left, lowerY, "ชนิดการดมยา", report.anesthesia);
  table(right, lowerY, "รายการที่เลือก", report.flags);
  doc.moveTo(left, 774).lineTo(left + width, 774).strokeColor(border).stroke();
  doc.fillColor(muted).font("Sarabun").fontSize(9).text("SURGIS ARANHOS  •  ข้อมูลสรุปจากทะเบียนผ่าตัด", left, 782, { lineBreak: false });
  doc.text("1 / 1", left + width - 45, 782, { width: 45, align: "right", lineBreak: false });
  doc.end();
  return finished;
}
