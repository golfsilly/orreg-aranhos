import { getAuthorizedUser } from "@/lib/authorization";
import { currentFiscalPeriod } from "@/lib/register/fiscal-period";
import { validFiscalYear, yearlyReport } from "@/lib/register/reports";
import Link from "next/link";
import { redirect } from "next/navigation";

export const instant = false;
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  if (!(await getAuthorizedUser("dashboard:read"))) redirect("/sign-in");
  const params = await searchParams;
  const fiscalYear =
    typeof params.year === "string"
      ? validFiscalYear(params.year)
      : currentFiscalPeriod().fiscalYear;
  if (!fiscalYear)
    return (
      <main className="min-h-screen bg-[#f4f8f5] bg-[radial-gradient(circle_at_85%_12%,#dcefe6,transparent_34%)] px-6 py-10">
        <div className="mx-auto max-w-[1100px]">
          <Link href="/reports" className="text-sm text-[#427b6f] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]">
            ← กลับรายงาน
          </Link>
          <p className="text-sm text-[#a33a36]">ปีงบประมาณไม่ถูกต้อง</p>
        </div>
      </main>
    );
  const report = await yearlyReport(fiscalYear);
  return (
    <main className="min-h-screen bg-[#f4f8f5] bg-[radial-gradient(circle_at_85%_12%,#dcefe6,transparent_34%)] px-6 py-10">
      <div className="mx-auto max-w-[1100px]">
        <Link href="/dashboard" className="text-sm text-[#427b6f] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]">
          ← กลับหน้าหลัก
        </Link>
        <div className="pt-[70px] pb-6 [&_h1]:mb-0 [&_h1]:text-[clamp(32px,5vw,48px)]">
          <span className="text-[11px] font-bold tracking-[0.2em] text-[#4c887a]">SURGERY REPORT</span>
          <h1 className="mt-5 mb-3 text-[clamp(38px,6vw,66px)] leading-[1.2] font-bold tracking-[-0.03em]">รายงานสรุป</h1>
          <p className="leading-[1.8] text-[#65817c]">จำนวนทะเบียนที่ซิงก์แล้ว แยกตามปีงบประมาณ</p>
        </div>
        <section className="mb-[30px] rounded-[18px] border border-[#dcebe3] bg-white p-7">
          <form className="flex flex-wrap items-end gap-3 [&_label]:m-0 [&_label]:min-w-[220px] [&_button]:m-0 [&_a]:m-0">
            <label className="mt-5 block text-sm font-bold">
              ปีงบประมาณ
              <input className="mt-2 block w-full rounded-lg border border-[#cbded4] p-[13px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]"
                name="year"
                type="number"
                min="2400"
                max="2800"
                defaultValue={fiscalYear}
                required
              />
            </label>
            <button className="mt-[22px] inline-flex cursor-pointer items-center justify-center gap-8 rounded-[10px] border-0 bg-[#166c5e] px-5 py-[15px] font-bold text-white no-underline hover:bg-[#10584d] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50">แสดงรายงาน</button>
            <a
              className="mt-[22px] inline-flex cursor-pointer items-center justify-center gap-8 rounded-[10px] border-0 bg-[#166c5e] px-5 py-[15px] font-bold text-white no-underline hover:bg-[#10584d] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50"
              href={`/api/reports/yearly?year=${fiscalYear}`}
            >
              ดาวน์โหลด CSV
            </a>
          </form>
          <p className="leading-[1.8] text-[#65817c]">
            รวม {report.total.toLocaleString("th-TH")} รายการ · Patho, Pre-op
            และ Post-op นับแยกกันและอาจซ้ำในรายการเดียว
          </p>
          <div className="grid grid-cols-2 gap-6 max-[600px]:grid-cols-1">
            <ReportTable
              title="รายเดือน"
              rows={report.months.map((row) => ({
                name: row.name,
                count: row.count,
              }))}
            />
            <ReportTable title="ประเภทผ่าตัด" rows={report.surgeryClass} />
            <ReportTable title="ช่วงเวลาผ่าตัดเล็ก" rows={report.minorPeriod} />
            <ReportTable title="ความเร่งด่วน" rows={report.urgency} />
            <ReportTable title="ชนิดการดมยา" rows={report.anesthesia} />
            <ReportTable title="รายการที่เลือก" rows={report.flags} />
          </div>
        </section>
      </div>
    </main>
  );
}

function ReportTable({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; count: number }[];
}) {
  return (
    <section className="[&_h2]:text-lg [&_h2]:font-semibold [&_table]:min-w-0">
      <h2>{title}</h2>
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="border-b border-[#e5eee8] px-2.5 py-3.5 font-semibold text-[#6a817a]">รายการ</th>
            <th className="border-b border-[#e5eee8] px-2.5 py-3.5 font-semibold text-[#6a817a]">จำนวน</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td className="border-b border-[#e5eee8] px-2.5 py-3.5">{row.name}</td>
              <td className="border-b border-[#e5eee8] px-2.5 py-3.5">{row.count.toLocaleString("th-TH")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
