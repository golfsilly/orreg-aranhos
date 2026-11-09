import { auth } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import "server-only";

/** Re-read the user's role from the application database on every request. */
export async function getAuthorizedUser(permission: Permission) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true, isActive: true, deletedAt: true, isPostopLead: true },
  });
  if (!user || !user.isActive || user.deletedAt || !hasPermission(user.role, permission))
    return null;
  if (permission === "postop:configure" && user.role !== "SUPERADMIN" && !user.isPostopLead) return null;
  return user;
}
