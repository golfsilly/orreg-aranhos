import { hashPassword } from "better-auth/crypto";
import { getAuthorizedUser } from "@/lib/authorization";
import { hasPermission, roles, type UserRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const user = await getAuthorizedUser("users:manage");
  if (!user || request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  const { userId } = await params;
  if (!userId || userId.length > 191) return Response.json({ error: "Invalid user" }, { status: 400, headers });
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  if (!data || typeof data.role !== "string" || !roles.includes(data.role as UserRole) || typeof data.isActive !== "boolean" || typeof data.name !== "string" || typeof data.email !== "string" || (data.password !== undefined && typeof data.password !== "string")) return Response.json({ error: "Invalid request" }, { status: 400, headers });
  const name = data.name.trim(), email = data.email.trim().toLowerCase(), role = data.role as UserRole, isActive = data.isActive;
  const password = data.password as string | undefined;
  if (!name || name.length > 191 || email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (password !== undefined && (password.length < 12 || password.length > 128))) return Response.json({ error: "Invalid request" }, { status: 400, headers });
  const hashed = password ? await hashPassword(password) : undefined;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Administrative mutations are rare; serialize them so two concurrent
      // demotions cannot remove the final active superadmin.
      await tx.$queryRaw`SELECT id FROM User ORDER BY id FOR UPDATE`;
      const actor = await tx.user.findUnique({ where: { id: user.id }, select: { id: true, role: true, isActive: true } });
      const target = await tx.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, isActive: true } });
      if (!actor?.isActive || !hasPermission(actor.role, "users:manage")) return "forbidden" as const;
      if (!target) return "missing" as const;
      if (actor.role !== "SUPERADMIN" && (target.role === "SUPERADMIN" || role === "SUPERADMIN")) return "forbidden" as const;
      if (target.role === "SUPERADMIN" && target.isActive && (role !== "SUPERADMIN" || !isActive)) {
        if (await tx.user.count({ where: { role: "SUPERADMIN", isActive: true } }) <= 1) return "lastSuperadmin" as const;
      }
      if (hashed) {
        const credentials = await tx.account.findMany({ where: { userId, providerId: "credential" }, select: { id: true }, take: 2 });
        if (credentials.length !== 1) return "missingCredential" as const;
        await tx.account.update({ where: { id: credentials[0].id }, data: { password: hashed } });
      }
      await tx.user.update({ where: { id: userId }, data: { name, email, role, isActive, ...(email !== target.email ? { emailVerified: false } : {}) } });
      if (hashed || isActive !== target.isActive) await tx.session.deleteMany({ where: { userId } });
      await tx.userManagementAudit.create({ data: { actorId: actor.id, targetId: target.id, action: "UPDATE", details: { before: { name: target.name, email: target.email, role: target.role, isActive: target.isActive }, after: { name, email, role, isActive }, passwordReset: Boolean(hashed) } } });
      return "ok" as const;
    }, { maxWait: 10000, timeout: 30000 });
    if (result === "forbidden") return Response.json({ error: "Forbidden" }, { status: 403, headers });
    if (result === "missing") return Response.json({ error: "Not found" }, { status: 404, headers });
    if (result === "lastSuperadmin" || result === "missingCredential") return Response.json({ error: result }, { status: 409, headers });
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return Response.json({ error: "Email already exists" }, { status: 409, headers });
    return Response.json({ error: "Unable to update user" }, { status: 503, headers });
  }
}
