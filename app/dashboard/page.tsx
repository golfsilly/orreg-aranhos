import { getAuthorizedUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { currentFiscalPeriod } from "@/lib/register/fiscal-period";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOut } from "./sign-out";

export const instant = false;

export default async function Dashboard() {
  const user = await getAuthorizedUser("dashboard:read");
  if (!user) redirect("/sign-in");
  const period = currentFiscalPeriod();
  const [total, months] = await Promise.all([
    prisma.surgeryRegister.count(),
    prisma.surgeryRegister.groupBy({
      by: ["calendarMonth"],
      where: { fiscalYear: period.fiscalYear },
      _count: { _all: true },
    }),
  ]);
  const counts = new Map(
    months.map((entry) => [entry.calendarMonth, entry._count._all]),
  );
  const fiscalTotal = months.reduce((sum, entry) => sum + entry._count._all, 0);
  const orderedMonths = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const names = [
    "",
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  const max = Math.max(1, ...months.map((entry) => entry._count._all));
  return (
    <main className="min-h-screen bg-[#f4f8f5] bg-[radial-gradient(circle_at_85%_12%,#dcefe6,transparent_34%)] px-6 py-10">
      <div className="mx-auto max-w-[1100px]">
        <div className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-3 text-base font-extrabold tracking-[0.1em] [&_small]:block [&_small]:text-[10px] [&_small]:tracking-[0.23em] [&_small]:text-[#71918b]">
            <span className="grid size-[42px] place-items-center rounded-[14px] bg-[#166c5e] text-[26px] text-white">
              +
            </span>
            <span>
              SURGIS <small>ARANHOS</small>
            </span>
          </div>
          <SignOut />
        </div>
        <div className="pt-20 pb-[35px] [&_h1]:mb-0 [&_h1]:text-[clamp(36px,5vw,54px)]">
          <span className="text-[11px] font-bold tracking-[0.2em] text-[#4c887a]">
            SURGERY OVERVIEW
          </span>
          <h1 className="mt-5 mb-3 text-[clamp(38px,6vw,66px)] leading-[1.2] font-bold tracking-[-0.03em]">
            สวัสดี {user.name}
          </h1>
          <p className="leading-[1.8] text-[#65817c]">
            ภาพรวมทะเบียนผ่าตัด · ปีงบประมาณ {period.fiscalYear}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {hasPermission(user.role, "register:read") && (
              <Link
                href="/operations"
                className="mt-[22px] inline-flex cursor-pointer items-center justify-center gap-8 rounded-[10px] border-0 bg-[#166c5e] px-5 py-[15px] font-bold text-white no-underline hover:bg-[#10584d] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ค้นหารายการผ่าตัด <span aria-hidden="true">→</span>
              </Link>
            )}
            {hasPermission(user.role, "users:manage") && (
              <Link
                href="/users"
                className="mt-[22px] inline-flex cursor-pointer items-center justify-center gap-8 rounded-[10px] border-0 bg-[#166c5e] px-5 py-[15px] font-bold text-white no-underline hover:bg-[#10584d] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                จัดการบัญชีผู้ใช้ <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </div>
        <p className="[&_a]:font-bold [&_a]:text-[#166c5e]">
          <Link href="/reports">รายงานสรุป / CSV &rarr;</Link>
        </p>
        <section
          className="mb-[18px] grid grid-cols-3 gap-4 max-[600px]:grid-cols-1 [&>div]:rounded-2xl [&>div]:border [&>div]:border-[#dcebe3] [&>div]:bg-white [&>div]:px-6 [&>div]:py-[22px] [&_span]:block [&_span]:text-[13px] [&_span]:text-[#65817c] [&_small]:block [&_small]:text-[13px] [&_small]:text-[#65817c] [&_strong]:mt-2.5 [&_strong]:mb-0.5 [&_strong]:block [&_strong]:text-[34px]"
          aria-label="สถิติทะเบียนผ่าตัด"
        >
          <div>
            <span>เดือนปัจจุบัน</span>
            <strong>
              {(counts.get(period.calendarMonth) ?? 0).toLocaleString("th-TH")}
            </strong>
            <small>รายการ</small>
          </div>
          <div>
            <span>ปีงบประมาณ {period.fiscalYear}</span>
            <strong>{fiscalTotal.toLocaleString("th-TH")}</strong>
            <small>รายการ</small>
          </div>
          <div>
            <span>ทะเบียนทั้งหมด</span>
            <strong>{total.toLocaleString("th-TH")}</strong>
            <small>รายการ</small>
          </div>
        </section>
        <section className="mb-[30px] rounded-[18px] border border-[#dcebe3] bg-white p-7 [&_h2]:m-0 [&_h2]:text-[19px] [&_h2]:font-semibold [&_p]:mt-1 [&_p]:text-[13px]">
          <h2>รายการรายเดือน</h2>
          <p className="leading-[1.8] text-[#65817c]">
            นับจากวันที่ผ่าตัดของรายการที่ซิงก์เข้าทะเบียน
          </p>
          <div
            className="mt-[25px] grid grid-cols-[repeat(12,minmax(30px,1fr))] gap-2.5 overflow-x-auto max-[600px]:grid-cols-[repeat(12,40px)]"
            role="img"
            aria-label={`จำนวนรายการรายเดือน ปีงบประมาณ ${period.fiscalYear}: ${orderedMonths.map((month) => `${names[month]} ${counts.get(month) ?? 0}`).join(", ")}`}
          >
            {orderedMonths.map((month) => (
              <div
                className="flex min-w-[30px] flex-col items-center gap-2 text-xs text-[#65817c]"
                key={month}
              >
                <span>{counts.get(month) ?? 0}</span>
                <div className="flex h-[150px] w-full max-w-8 items-end overflow-hidden rounded-t-md bg-[#f2f7f3]">
                  <div
                    className="w-full rounded-t-md bg-[#2c8b75]"
                    style={{
                      height: `${((counts.get(month) ?? 0) / max) * 100}%`,
                    }}
                  />
                </div>
                <small>{names[month]}</small>
              </div>
            ))}
          </div>
        </section>
        <div className="border-t border-[#d5e5dc] pt-[22px] text-[13px] leading-[1.8] text-[#6a817a]">
          ระบบอยู่ระหว่างพัฒนา ยังไม่พร้อมใช้กับข้อมูลผู้ป่วยจริง
        </div>
      </div>
    </main>
  );
}
