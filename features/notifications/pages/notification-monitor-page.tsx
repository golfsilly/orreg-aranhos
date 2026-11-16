import { NotificationMonitor } from "@/features/notifications/components/notification-monitor";
import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export default async function NotificationMonitorPage() {
  await connection();
  const actor = await getAuthorizedUser("audit:read");
  if (!actor || actor.role !== "SUPERADMIN") {
    await recordDenied("NOTIFICATIONS_MONITOR_READ", actor?.id);
    redirect("/dashboard");
  }
  return <NotificationMonitor />;
}
