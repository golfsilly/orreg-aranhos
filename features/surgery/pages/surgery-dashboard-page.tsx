import { redirect } from "next/navigation";
import { getAuthorizedUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { currentFiscalPeriod } from "@/lib/register/fiscal-period";
import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";

export default async function SurgeryDashboardPage() {
  const user = await getAuthorizedUser("dashboard:read");
  if (!user) redirect("/signin");
  const period = currentFiscalPeriod();
  const [total, months] = await Promise.all([
    prisma.surgeryRegister.count(),
    prisma.surgeryRegister.groupBy({ by: ["calendarMonth"], where: { fiscalYear: period.fiscalYear }, _count: { _all: true } }),
  ]);
  return <DashboardOverview user={{ name: user.name, role: user.role }} period={period} total={total} months={months.map((entry) => ({ month: entry.calendarMonth, count: entry._count._all }))} />;
}
