import { OperatingRoomCalendarPage } from "@/features/operations/components/calendar/operating-room-calendar-page";
import { getAuthorizedUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function SurgeryCalendarPage() {
  const user = await getAuthorizedUser("register:read");
  if (!user) redirect("/surgery/dashboard");
  return <OperatingRoomCalendarPage canEdit={hasPermission(user.role, "register:write")} />;
}
