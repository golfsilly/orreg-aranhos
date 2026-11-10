import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ClipboardList, FileDown, ShieldCheck } from "lucide-react";
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
  return <div className="space-y-6 sm:space-y-8">
    <header className="relative isolate overflow-hidden rounded-[28px] border border-emerald-900/10 bg-gradient-to-br from-[#f5faf5] via-card to-card p-5 shadow-sm dark:border-emerald-100/10 dark:from-[#11271d] sm:p-7 lg:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 -z-10 size-72 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-primary"><Activity aria-hidden="true" className="size-3.5" /> OR-REG · REPORT CENTER</p>
          <h1 className="m-0 text-[27px] font-semibold tracking-[-0.035em] sm:text-[34px]">รายงานและสถิติ</h1>
          <p className="mb-0 mt-2 max-w-xl text-sm leading-6 text-muted-foreground">ภาพรวมปริมาณงาน ทีมแพทย์ และการใช้ห้องผ่าตัด เลือกช่วงข้อมูลเพื่อเจาะดูรายละเอียดที่ต้องการ</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/70 px-3 py-2 text-muted-foreground"><ShieldCheck aria-hidden="true" className="size-3.5 text-primary" /> อ่าน HOSxP แบบ read-only</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/70 px-3 py-2 text-muted-foreground"><ClipboardList aria-hidden="true" className="size-3.5 text-primary" /> สถิติทะเบียนและการใช้ห้อง</span>
        </div>
      </div>
    </header>

    <SurgeryStatistics />

    <details className="group overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-muted/25 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FileDown aria-hidden="true" className="size-[18px]" /></span><span className="min-w-0"><span className="block text-sm font-semibold">รายงานประจำปีงบประมาณ</span><span className="mt-0.5 block text-[11px] text-muted-foreground">เลือกปีและดาวน์โหลดไฟล์สรุป</span></span></span>
        <span className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">{report.total.toLocaleString("th-TH")} รายการ</span>
      </summary>
      <div className="border-t border-border p-4 sm:p-6">
        <ReportYearFilter fiscalYear={fiscalYear} />
        <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-7 rounded-2xl bg-muted/20 p-4 sm:p-5 lg:grid-cols-2">
          <ReportTable title="รายเดือน" rows={report.months.map((row) => ({ name: row.name, count: row.count }))} />
          <ReportTable title="ประเภทผ่าตัด" rows={report.surgeryClass} />
          <ReportTable title="ช่วงเวลาผ่าตัดเล็ก" rows={report.minorPeriod} />
          <ReportTable title="ความเร่งด่วน" rows={report.urgency} />
          <ReportTable title="ชนิดการดมยา" rows={report.anesthesia} />
          <ReportTable title="รายการที่เลือก" rows={report.flags} />
        </div>
      </div>
    </details>
  </div>;
}
