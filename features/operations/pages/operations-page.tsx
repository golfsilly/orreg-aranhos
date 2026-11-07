import { OperationsSearch } from "@/features/operations/components/search";
import { getAuthorizedUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function OperationsPage() {
  const user = await getAuthorizedUser("register:read");
  if (!user) redirect("/surgery/dashboard");
  return (
    <div>
      <div className="mb-7">
        <p className="mb-3 text-[10px] font-bold tracking-[0.18em] text-primary">
          SURGERY REGISTER
        </p>
        <h1 className="text-[28px] font-semibold tracking-[-0.035em] sm:text-[34px]">
          ทะเบียนผ่าตัด
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          ค้นหารายการตามวันที่ใน HOSxP เพื่อดูข้อมูลและทีมผ่าตัด
        </p>
      </div>
      <OperationsSearch canSync={hasPermission(user.role, "register:write")} />
      <div className="rounded-2xl border border-border bg-muted/60 px-5 py-4 text-xs leading-6 text-muted-foreground">
        ระบบอยู่ระหว่างพัฒนา ยังไม่พร้อมใช้กับข้อมูลผู้ป่วยจริง
      </div>
    </div>
  );
}
