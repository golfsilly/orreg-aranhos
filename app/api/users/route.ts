import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { getAuthorizedUser } from "@/lib/authorization";
import { hasPermission, roles, type UserRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { hashCid, normalizeUsername } from "@/lib/identity";
import { z } from "zod";
import { writeAudit } from "@/lib/audit/write";
import { recordDenied } from "@/lib/audit/denied";
import { passwordSchema } from "@/lib/password-policy";
import { workFieldsSchema } from "@/lib/user-profile";
import { listQuerySchema, listUsers, userListSelect } from "@/lib/users/list";
import { hasTrustedRequestOrigin } from "@/lib/security/request-origin";

const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  const actor = await getAuthorizedUser("users:manage");
  if (!actor) { await recordDenied("USERS_READ"); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  const parsed = listQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) { await writeAudit(prisma, { actorId: actor.id, event: "USERS_READ", outcome: "FAILURE", metadata: { reason: "INVALID_INPUT" } }); return Response.json({ error: "Invalid query" }, { status: 400, headers }); }
  const result = await listUsers(parsed.data);
  await writeAudit(prisma, { actorId: actor.id, event: "USERS_READ", outcome: "SUCCESS", metadata: { total: result.users.length } });
  return Response.json(result, { headers });
}

export async function POST(request: Request) {
  const user = await getAuthorizedUser("users:manage");
  if (!user || !hasTrustedRequestOrigin(request)) { await recordDenied("USER_CREATED", user?.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  const failure = async (reason: "INVALID_INPUT" | "CONFLICT" | "UNAVAILABLE") => writeAudit(prisma, { actorId: user.id, event: "USER_CREATED", outcome: "FAILURE", metadata: { reason } });
  let body: unknown;
  try { body = await request.json(); } catch { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const parsed = workFieldsSchema.extend({ email: z.string(), name: z.string(), password: z.string(), role: z.unknown().optional(), username: z.unknown().optional(), cid: z.unknown().optional() }).strict().safeParse(body);
  if (!parsed.success) { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const data = parsed.data;
  const email = data.email.trim().toLowerCase(), name = data.name.trim(), password = data.password;
  const role = data.role === undefined ? "USER" : data.role;
  let username: string | null, cidSha256: string | null;
  try { username = normalizeUsername(data.username); cidSha256 = hashCid(data.cid); } catch { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid username or CID" }, { status: 400, headers }); }
  if (!name || name.length > 191 || email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !passwordSchema.safeParse(password).success || typeof role !== "string" || !roles.includes(role as UserRole)) { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const hashed = await hashPassword(password);
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM User ORDER BY id FOR UPDATE`;
      const actor = await tx.user.findUnique({ where: { id: user.id }, select: { id: true, role: true, isActive: true } });
      if (!actor?.isActive || !hasPermission(actor.role, "users:manage") || ((role === "ADMIN" || role === "SUPERADMIN") && actor.role !== "SUPERADMIN")) return "forbidden" as const;
      if (role === "SUPERADMIN" && await tx.user.count({ where: { role: "SUPERADMIN" } }) > 0) return "superadminExists" as const;
      const id = randomUUID();
      const created = await tx.user.create({ data: { id, name, email, username, cidSha256, role: role as UserRole, organization: data.organization, mission: data.mission, workGroup: data.workGroup, jobTitle: data.jobTitle, jobLevel: data.jobLevel, accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: hashed } } }, select: userListSelect });
      await tx.userManagementAudit.create({ data: { actorId: actor.id, targetId: id, action: "CREATE", details: { role, isActive: true } } });
      await writeAudit(tx, { actorId: actor.id, event: "USER_CREATED", outcome: "SUCCESS", targetType: "USER", targetId: id, metadata: { role: role as UserRole, active: true } });
      return created;
    });
    if (result === "forbidden") { await recordDenied("USER_CREATED", user.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
    if (result === "superadminExists") { await failure("CONFLICT"); return Response.json({ error: result }, { status: 409, headers }); }
    return Response.json({ user: result }, { status: 201, headers });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") { await failure("CONFLICT"); return Response.json({ error: "Duplicate identity" }, { status: 409, headers }); }
    await failure("UNAVAILABLE");
    return Response.json({ error: "Unable to create user" }, { status: 503, headers });
  }
}
