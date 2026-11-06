import { getAuthorizedUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OperationsSearch } from "./search";

export const instant = false;

export default async function OperationsPage() {
  const user = await getAuthorizedUser("register:read");
  if (!user) redirect("/dashboard");
  return (
    <main className="min-h-screen bg-[#f4f8f5] bg-[radial-gradient(circle_at_85%_12%,#dcefe6,transparent_34%)] px-6 py-10">
      <div className="mx-auto max-w-[1100px]">
        <Link
          href="/dashboard"
          className="text-sm text-[#427b6f] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]"
        >
          ← กลับหน้าหลัก
        </Link>
        <div className="pt-[70px] pb-6 [&_h1]:mb-0 [&_h1]:text-[clamp(32px,5vw,48px)]">
          <span className="text-[11px] font-bold tracking-[0.2em] text-[#4c887a]">
            HOSxP · SURGERY
          </span>
          <h1 className="mt-5 mb-3 text-[clamp(38px,6vw,66px)] leading-[1.2] font-bold tracking-[-0.03em]">
            รายการผ่าตัด
          </h1>
          <p className="leading-[1.8] text-[#65817c]">
            ค้นหารายการตามวันที่ใน HOSxP เพื่อดูข้อมูลและทีมผ่าตัด
          </p>
        </div>
        <OperationsSearch
          canSync={hasPermission(user.role, "register:write")}
        />
        <div className="border-t border-[#d5e5dc] pt-[22px] text-[13px] leading-[1.8] text-[#6a817a]">
          ระบบอยู่ระหว่างพัฒนา ยังไม่พร้อมใช้กับข้อมูลผู้ป่วยจริง
        </div>
      </div>
    </main>
  );
}
