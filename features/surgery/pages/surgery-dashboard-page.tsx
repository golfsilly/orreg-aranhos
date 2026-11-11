import { redirect } from "next/navigation";
import { getAuthorizedUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { AnalyticsHeader } from "@/features/reports/components/analytics-header";
import { SurgeryStatistics } from "@/features/reports/components/surgery-statistics";

export default async function SurgeryDashboardPage() {
  const user = await getAuthorizedUser("dashboard:read");
  if (!user) redirect("/signin");
  const initialDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const canReadRegisters = hasPermission(user.role, "register:read");
  return <div className="space-y-6"><AnalyticsHeader overview canReadRegisters={canReadRegisters} /><SurgeryStatistics overview initialDay={initialDay} canReadRegisters={canReadRegisters} /></div>;
}
