import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthorizedUser } from "@/lib/authorization";
import { currentFiscalPeriod } from "@/lib/register/fiscal-period";
import { validFiscalYear, yearlyReport } from "@/lib/register/reports";
import { ReportTable, ReportYearFilter } from "@/features/reports/components/report-controls";
import { SurgeryStatistics } from "@/features/reports/components/surgery-statistics";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string | string[] }> }) {
  if (!(await getAuthorizedUser("dashboard:read"))) redirect("/signin");
  const params = await searchParams;
  const fiscalYear = typeof params.year === "string" ? validFiscalYear(params.year) : currentFiscalPeriod().fiscalYear;
  if (!fiscalYear) return <div><Link href="/surgery/reports" className="text-sm font-medium text-primary hover:underline">← กลับรายงาน</Link><p className="mt-4 text-sm text-destructive">ปีงบประมาณไม่ถูกต้อง</p></div>;
  const report = await yearlyReport(fiscalYear);
  return <div className="space-y-6"><div className="mb-1"><p className="mb-3 text-[10px] font-bold tracking-[0.18em] text-primary">REPORTS & INSIGHTS</p><h1 className="text-[28px] font-semibold tracking-[-0.035em] sm:text-[34px]">รายงานและสถิติ</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">ภาพรวมจำนวนเคส แพทย์ และการใช้ห้องผ่าตัด</p></div><SurgeryStatistics /><details className="group rounded-2xl border border-border bg-card shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 text-sm font-semibold transition hover:bg-muted/30 [&::-webkit-details-marker]:hidden"><span>รายละเอียดรายงานปีงบประมาณ</span><span className="text-xs font-normal text-muted-foreground">รวม {report.total.toLocaleString("th-TH")} รายการ · Patho, Pre-op และ Post-op อาจซ้ำในรายการเดียว</span></summary><div className="border-t border-border p-4 sm:p-6"><ReportYearFilter fiscalYear={fiscalYear} /><div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-7 lg:grid-cols-2"><ReportTable title="รายเดือน" rows={report.months.map((row) => ({ name: row.name, count: row.count }))} /><ReportTable title="ประเภทผ่าตัด" rows={report.surgeryClass} /><ReportTable title="ช่วงเวลาผ่าตัดเล็ก" rows={report.minorPeriod} /><ReportTable title="ความเร่งด่วน" rows={report.urgency} /><ReportTable title="ชนิดการดมยา" rows={report.anesthesia} /><ReportTable title="รายการที่เลือก" rows={report.flags} /></div></div></details></div>;
}
