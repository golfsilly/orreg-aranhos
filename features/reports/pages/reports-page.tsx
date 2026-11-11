import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown, FileDown } from "lucide-react";
import { getAuthorizedUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { currentFiscalPeriod } from "@/lib/register/fiscal-period";
import { validFiscalYear, yearlyReport } from "@/lib/register/reports";
import { ReportTable, ReportYearFilter } from "@/features/reports/components/report-controls";
import { SurgeryStatistics } from "@/features/reports/components/surgery-statistics";
import { AnalyticsHeader } from "@/features/reports/components/analytics-header";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string | string[] }> }) {
  const user = await getAuthorizedUser("dashboard:read");
  if (!user) redirect("/signin");
  const params = await searchParams;
  const currentYear = currentFiscalPeriod().fiscalYear;
  const fiscalYear = typeof params.year === "string" ? validFiscalYear(params.year) : currentYear;
  if (!fiscalYear || fiscalYear < 2569 || fiscalYear > currentYear) return <div><Link href="/surgery/reports" className="text-sm font-medium text-primary hover:underline">← กลับรายงาน</Link><p className="mt-4 text-sm text-destructive">เลือกปีงบประมาณตั้งแต่ 2569 ถึงปีปัจจุบัน</p></div>;
  const report = await yearlyReport(fiscalYear);
  const initialDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const canReadRegisters = hasPermission(user.role, "register:read");
  return <div className="space-y-6">
    <AnalyticsHeader canReadRegisters={canReadRegisters} />
    <SurgeryStatistics initialDay={initialDay} canReadRegisters={canReadRegisters} />
    <details className="group overflow-hidden rounded-2xl border border-border/80 bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 transition-colors hover:bg-muted/20 sm:p-6 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FileDown className="size-4" aria-hidden="true" /></span><span><span className="block text-sm font-semibold">รายงานประจำปีงบประมาณ</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">สรุปทุกแผนก · 1 ตุลาคม–30 กันยายน · ดาวน์โหลด PDF / CSV</span></span></span><ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border p-5 sm:p-6"><ReportYearFilter fiscalYear={fiscalYear} currentFiscalYear={currentYear} /><p className="mt-4 rounded-xl bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground">ปีงบประมาณ {fiscalYear} · รวม {report.total.toLocaleString("th-TH")} ทะเบียน · ข้อมูลส่วนนี้ใช้ปีที่เลือกด้านบนและรวมทุกแผนก โดยไม่อิงตัวกรองสถิติด้านบน</p>
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-2"><ReportTable title="จำนวนเคสรายเดือน" rows={report.months} /><ReportTable title="ประเภทผ่าตัด" rows={report.surgeryClass} /><ReportTable title="ช่วงเวลาผ่าตัดเล็ก" rows={report.minorPeriod} /><ReportTable title="ความเร่งด่วนที่บันทึกใน OR-Reg" rows={report.urgency} /><ReportTable title="ชนิดการดมยา" rows={report.anesthesia} /><ReportTable title="รายการที่มีการทำเครื่องหมาย" rows={report.flags} /></div>
      </div>
    </details>
  </div>;
}
