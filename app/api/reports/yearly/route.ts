import { getAuthorizedUser } from "@/lib/authorization";
import { validFiscalYear, yearlyReport } from "@/lib/register/reports";

export async function GET(request: Request) {
  if (!await getAuthorizedUser("dashboard:read")) return Response.json({ error: "Forbidden" }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  const year = validFiscalYear(new URL(request.url).searchParams.get("year") ?? "");
  if (!year) return Response.json({ error: "Invalid year" }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  const report = await yearlyReport(year);
  const rows = [
    ["ปีงบประมาณ", String(year)],
    ["หมวด", "รายการ", "จำนวน"],
    ...report.months.map((row) => ["รายเดือน", row.name, String(row.count)]),
    ...report.surgeryClass.map((row) => ["ประเภทผ่าตัด", row.name, String(row.count)]),
    ...report.minorPeriod.map((row) => ["ช่วงเวลาผ่าตัดเล็ก", row.name, String(row.count)]),
    ...report.urgency.map((row) => ["ความเร่งด่วน", row.name, String(row.count)]),
    ...report.anesthesia.map((row) => ["ชนิดการดมยา", row.name, String(row.count)]),
    ...report.flags.map((row) => ["รายการที่เลือก", row.name, String(row.count)]),
    ["รวม", "ทะเบียนทั้งหมด", String(report.total)],
  ];
  const csv = "\uFEFF" + rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\r\n") + "\r\n";
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="surgery-report-${year}.csv"`, "Cache-Control": "private, no-store" } });
}
