import { getAuthorizedUser } from "@/lib/authorization";
import { redirect } from "next/navigation";
import { SystemDashboard } from "@/features/dashboard/components/system-dashboard";

export default async function Dashboard() {
  const user = await getAuthorizedUser("dashboard:read");
  if (!user) redirect("/signin");
  return <SystemDashboard user={{ name: user.name, role: user.role }} />;
}
