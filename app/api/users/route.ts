import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { getAuthorizedUser } from "@/lib/authorization";
import { hasPermission, roles, type UserRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const headers = { "Cache-Control": "private, no-store" };
const select = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } as const;

export async function GET() {
  if (!await getAuthorizedUser("users:manage")) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  const users = await prisma.user.findMany({ select, orderBy: [{ name: "asc" }, { id: "asc" }], take: 201 });
  return Response.json({ users: users.slice(0, 200), hasMore: users.length > 200 }, { headers });
}

export async function POST(request: Request) {
  const user = await getAuthorizedUser("users:manage");
  if (!user || request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  if (!data || typeof data.email !== "string" || typeof data.name !== "string" || typeof data.password !== "string") return Response.json({ error: "Invalid request" }, { status: 400, headers });
  const email = data.email.trim().toLowerCase(), name = data.name.trim(), password = data.password;
  const role = data.role === undefined ? "USER" : data.role;
  if (!name || name.length > 191 || email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 128 || typeof role !== "string" || !roles.includes(role as UserRole)) return Response.json({ error: "Invalid request" }, { status: 400, headers });
  const hashed = await hashPassword(password);
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM User ORDER BY id FOR UPDATE`;
      const actor = await tx.user.findUnique({ where: { id: user.id }, select: { id: true, role: true, isActive: true } });
      if (!actor?.isActive || !hasPermission(actor.role, "users:manage") || (role === "SUPERADMIN" && actor.role !== "SUPERADMIN")) return null;
      const id = randomUUID();
      const created = await tx.user.create({ data: { id, name, email, role: role as UserRole, accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: hashed } } }, select });
      await tx.userManagementAudit.create({ data: { actorId: actor.id, targetId: id, action: "CREATE", details: { role, isActive: true } } });
      return created;
    });
    return result ? Response.json({ user: result }, { status: 201, headers }) : Response.json({ error: "Forbidden" }, { status: 403, headers });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return Response.json({ error: "Email already exists" }, { status: 409, headers });
    return Response.json({ error: "Unable to create user" }, { status: 503, headers });
  }
}
