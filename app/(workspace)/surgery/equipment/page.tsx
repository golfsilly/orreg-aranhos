import { EquipmentWorkspace } from "@/features/equipment/components/equipment-workspace";
import { getAuthorizedUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";

export default async function Page() {
  const user = await getAuthorizedUser("equipment:read");
  return <EquipmentWorkspace canWrite={Boolean(user && hasPermission(user.role, "equipment:write"))} />;
}
