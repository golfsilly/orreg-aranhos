import { OperationsWorkspace } from "@/features/operations/components/operations-workspace";
import { OperationsPageHeader } from "@/features/operations/components/shared/operations-page-header";
import { getAuthorizedUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function OperationsPage() {
  const user = await getAuthorizedUser("register:read");
  if (!user) redirect("/surgery/dashboard");
  return (
    <div>
      <OperationsPageHeader />
      <OperationsWorkspace
        canSync={hasPermission(user.role, "register:write")}
      />
    </div>
  );
}
