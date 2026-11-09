import { PostOpWorkspace } from "@/features/post-op/components/post-op-workspace";
import { getAuthorizedUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";

export default async function Page() {
  const user = await getAuthorizedUser("postop:read");
  const canConfigure = user
    ? await getAuthorizedUser("postop:configure")
    : null;
  return (
    <PostOpWorkspace
      canWrite={Boolean(user && hasPermission(user.role, "postop:write"))}
      canConfigure={Boolean(canConfigure)}
      isSuperadmin={user?.role === "SUPERADMIN"}
    />
  );
}
