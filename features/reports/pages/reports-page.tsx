import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthorizedUser } from "@/lib/authorization";
import { currentFiscalPeriod } from "@/lib/register/fiscal-period";
import { validFiscalYear, yearlyReport } from "@/lib/register/reports";
import { ReportTable, ReportYearFilter } from "@/features/reports/components/report-controls";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string | string[] }> }) {
  if (!(await getAuthorizedUser("dashboard:read"))) redirect("/signin");
  const params = await searchParams;
  const fiscalYear = typeof params.year === "string" ? validFiscalYear(params.year) : currentFiscalPeriod().fiscalYear;
  if (!fiscalYear) return <div><Link href="/surgery/reports" className="text-sm font-medium text-primary hover:underline">← กลับรายงาน</Link><p className="mt-4 text-sm text-destructive">ปีงบประมาณไม่ถูกต้อง</p></div>;
  const report = await yearlyReport(fiscalYear);
  return <div><div className="mb-7"><p className="mb-3 text-[10px] font-bold tracking-[0.18em] text-primary">REPORTS & INSIGHTS</p><h1 className="text-[28px] font-semibold tracking-[-0.035em] sm:text-[34px]">รายงานสรุป</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">จำนวนทะเบียนที่ซิงก์แล้ว แยกตามปีงบประมาณ</p></div><section className="rounded-[20px] border border-border bg-card p-5 shadow-[0_5px_24px_#11271a06] sm:p-7"><ReportYearFilter fiscalYear={fiscalYear} /><p className="mt-5 text-sm leading-7 text-muted-foreground">รวม {report.total.toLocaleString("th-TH")} รายการ · Patho, Pre-op และ Post-op นับแยกกันและอาจซ้ำในรายการเดียว</p><div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-7 lg:grid-cols-2"><ReportTable title="รายเดือน" rows={report.months.map((row) => ({ name: row.name, count: row.count }))} /><ReportTable title="ประเภทผ่าตัด" rows={report.surgeryClass} /><ReportTable title="ช่วงเวลาผ่าตัดเล็ก" rows={report.minorPeriod} /><ReportTable title="ความเร่งด่วน" rows={report.urgency} /><ReportTable title="ชนิดการดมยา" rows={report.anesthesia} /><ReportTable title="รายการที่เลือก" rows={report.flags} /></div></section></div>;
}
