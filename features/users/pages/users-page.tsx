import { UserManager } from "@/features/users/components/user-manager";
import { getAuthorizedUser } from "@/lib/authorization";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const user = await getAuthorizedUser("users:manage");
  if (!user) redirect("/dashboard");
  return (
    <div>
      <div className="mb-7">
        <p className="mb-3 text-[10px] font-bold tracking-[0.18em] text-primary">
          ADMINISTRATION
        </p>
        <h1 className="text-[28px] font-semibold tracking-[-0.035em] sm:text-[34px]">
          จัดการบัญชีผู้ใช้
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          เพิ่มบัญชี กำหนดบทบาท และจัดการสถานะการใช้งาน
        </p>
      </div>
      <UserManager
        isSuperadmin={user.role === "SUPERADMIN"}
        actorId={user.id}
      />
    </div>
  );
}
