import { UserManager } from "@/features/users/components/user-manager";
import { getAuthorizedUser } from "@/lib/authorization";
import { redirect } from "next/navigation";
import { KeyRound, ShieldCheck, UsersRound } from "lucide-react";

export default async function UsersPage() {
  const user = await getAuthorizedUser("users:manage");
  if (!user) redirect("/dashboard");
  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6 pb-8">
      <header className="relative isolate overflow-hidden rounded-[26px] border border-border bg-card px-5 py-5 shadow-sm sm:px-7 sm:py-6">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_100%_0%,#c9a96818,transparent_34%),linear-gradient(115deg,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_58%)]" />
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3.5"><span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-primary/10 bg-primary/8 text-primary shadow-sm"><UsersRound aria-hidden="true" className="size-5" /></span><div><p className="text-[10px] font-bold tracking-[0.2em] text-primary">ADMINISTRATION · IDENTITY</p><h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">จัดการบัญชีผู้ใช้</h1><p className="mt-1.5 text-sm leading-6 text-muted-foreground">ดูแลบัญชี บทบาท และข้อมูลหน่วยงานจากพื้นที่จัดการเดียว</p></div></div>
          <div className="flex max-w-sm items-center gap-3 rounded-2xl border border-primary/10 bg-primary/[0.035] px-4 py-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound aria-hidden="true" className="size-4" /></span><div><p className="text-xs font-semibold">การจัดการสิทธิ์อย่างปลอดภัย</p><p className="mt-0.5 text-[11px] leading-5 text-muted-foreground"><ShieldCheck aria-hidden="true" className="mr-1 inline size-3.5 text-primary" />การดำเนินการถูกตรวจสอบตามบทบาทบัญชี</p></div></div>
        </div>
      </header>
      <UserManager
        isSuperadmin={user.role === "SUPERADMIN"}
        actorId={user.id}
      />
    </div>
  );
}
