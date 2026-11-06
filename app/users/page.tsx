import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthorizedUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { UserManager } from "./user-manager";

export const instant = false;
export default async function UsersPage() {
  const user = await getAuthorizedUser("users:manage");
  if (!user) redirect("/dashboard");
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 201 });
  return <main className="min-h-screen bg-[#f4f8f5] bg-[radial-gradient(circle_at_85%_12%,#dcefe6,transparent_34%)] px-6 py-10"><div className="mx-auto max-w-[1100px]"><Link href="/dashboard" className="text-sm text-[#427b6f] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]">← กลับหน้าหลัก</Link><div className="pt-[70px] pb-6 [&_h1]:mb-0 [&_h1]:text-[clamp(32px,5vw,48px)]"><span className="text-[11px] font-bold tracking-[0.2em] text-[#4c887a]">ADMINISTRATION</span><h1 className="mt-5 mb-3 text-[clamp(38px,6vw,66px)] leading-[1.2] font-bold tracking-[-0.03em]">จัดการบัญชีผู้ใช้</h1><p className="leading-[1.8] text-[#65817c]">เพิ่มบัญชี กำหนดบทบาท และจัดการสถานะการใช้งาน</p></div><UserManager isSuperadmin={user.role === "SUPERADMIN"} initialUsers={users.slice(0, 200)} initialHasMore={users.length > 200} /></div></main>;
}
