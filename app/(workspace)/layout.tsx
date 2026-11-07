import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";
import { WorkspaceShellSkeleton } from "@/features/workspace/components/workspace-shell-skeleton";
import { getAuthorizedUser } from "@/lib/authorization";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const instant = false;

async function AuthenticatedWorkspace({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthorizedUser("dashboard:read");
  if (!user) redirect("/signin");
  return (
    <WorkspaceShell user={{ name: user.name, role: user.role }}>
      {children}
    </WorkspaceShell>
  );
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<WorkspaceShellSkeleton />}>
      <AuthenticatedWorkspace>{children}</AuthenticatedWorkspace>
    </Suspense>
  );
}
