import { auth } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { cache } from "react";
import "server-only";

const getRequestSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

const getAuthorizationUser = cache((id: string) =>
  prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true,
      deletedAt: true,
      isPostopLead: true,
    },
  }),
);

/** Re-read the user's role from the application database on every request. */
export async function getAuthorizedUser(permission: Permission) {
  const session = await getRequestSession();
  if (!session) return null;
  const user = await getAuthorizationUser(session.user.id);
  if (!user || !user.isActive || user.deletedAt || !hasPermission(user.role, permission))
    return null;
  if (permission === "postop:configure" && user.role !== "SUPERADMIN" && !user.isPostopLead) return null;
  return user;
}
