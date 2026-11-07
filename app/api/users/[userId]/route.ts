import { hashPassword } from "better-auth/crypto";
import { getAuthorizedUser } from "@/lib/authorization";
import { hasPermission, roles, type UserRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { hashCid, normalizeUsername } from "@/lib/identity";
import { z } from "zod";
import { writeAudit } from "@/lib/audit/write";
import { recordDenied } from "@/lib/audit/denied";
import { passwordSchema } from "@/lib/password-policy";
import { workFieldNames, workFieldsSchema } from "@/lib/user-profile";

const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const user = await getAuthorizedUser("users:manage");
  if (!user || request.headers.get("origin") !== new URL(request.url).origin) { await recordDenied("USER_UPDATED", user?.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  const failure = async (reason: "INVALID_INPUT" | "CONFLICT" | "NOT_FOUND" | "UNAVAILABLE") => writeAudit(prisma, { actorId: user.id, event: "USER_UPDATED", outcome: "FAILURE", metadata: { reason } });
  const { userId } = await params;
  if (!userId || userId.length > 191) { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid user" }, { status: 400, headers }); }
  let body: unknown;
  try { body = await request.json(); } catch { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const parsed = workFieldsSchema.extend({ role: z.enum(roles), isActive: z.boolean(), name: z.string(), email: z.string(), password: z.string().optional(), username: z.unknown().optional(), cid: z.unknown().optional() }).strict().safeParse(body);
  if (!parsed.success) { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const data = parsed.data;
  const name = data.name.trim(), email = data.email.trim().toLowerCase(), role = data.role as UserRole, isActive = data.isActive;
  const password = data.password as string | undefined;
  let username: string | null | undefined, cidSha256: string | null | undefined;
  try { username = data.username === undefined ? undefined : normalizeUsername(data.username); cidSha256 = data.cid === undefined ? undefined : hashCid(data.cid); } catch { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid username or CID" }, { status: 400, headers }); }
  if (!name || name.length > 191 || email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (password !== undefined && !passwordSchema.safeParse(password).success)) { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const hashed = password ? await hashPassword(password) : undefined;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Administrative mutations are rare; serialize them so two concurrent
      // demotions cannot remove the final active superadmin.
      await tx.$queryRaw`SELECT id FROM User ORDER BY id FOR UPDATE`;
      const actor = await tx.user.findUnique({ where: { id: user.id }, select: { id: true, role: true, isActive: true } });
      const target = await tx.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, username: true, role: true, isActive: true, deletedAt: true, organization: true, mission: true, workGroup: true, jobTitle: true, jobLevel: true } });
      if (!actor?.isActive || !hasPermission(actor.role, "users:manage")) return "forbidden" as const;
      if (!target) return "missing" as const;
      if (target.deletedAt) return "deleted" as const;
      if (actor.role !== "SUPERADMIN" && (target.role === "SUPERADMIN" || role === "SUPERADMIN" || (role === "ADMIN" && target.role !== "ADMIN"))) return "forbidden" as const;
      if (target.role === "SUPERADMIN" && target.isActive && (role !== "SUPERADMIN" || !isActive)) {
        if (await tx.user.count({ where: { role: "SUPERADMIN", isActive: true } }) <= 1) return "lastSuperadmin" as const;
      }
      if (hashed) {
        const credentials = await tx.account.findMany({ where: { userId, providerId: "credential" }, select: { id: true }, take: 2 });
        if (credentials.length !== 1) return "missingCredential" as const;
        await tx.account.update({ where: { id: credentials[0].id }, data: { password: hashed } });
      }
      const workDetailsChanged = workFieldNames.some((field) => data[field] !== undefined && data[field] !== target[field]);
      await tx.user.update({ where: { id: userId }, data: { name, email, role, isActive, username, cidSha256, organization: data.organization, mission: data.mission, workGroup: data.workGroup, jobTitle: data.jobTitle, jobLevel: data.jobLevel, ...(email !== target.email ? { emailVerified: false } : {}) } });
      if (cidSha256 !== undefined) await tx.account.deleteMany({ where: { userId, providerId: "moph-provider-id" } });
      if (hashed || isActive !== target.isActive || cidSha256 !== undefined) await tx.session.deleteMany({ where: { userId } });
      await tx.userManagementAudit.create({ data: { actorId: actor.id, targetId: target.id, action: "UPDATE", details: { before: { name: target.name, email: target.email, role: target.role, isActive: target.isActive }, after: { name, email, role, isActive }, passwordReset: Boolean(hashed), providerIdentityChanged: cidSha256 !== undefined } } });
      await writeAudit(tx, { actorId: actor.id, event: "USER_UPDATED", outcome: "SUCCESS", targetType: "USER", targetId: target.id, metadata: { previousRole: target.role, role, previousActive: target.isActive, active: isActive, passwordChanged: Boolean(hashed), providerIdentityChanged: cidSha256 !== undefined, usernameChanged: username !== undefined && username !== target.username, nameChanged: name !== target.name, emailChanged: email !== target.email, workDetailsChanged } });
      return "ok" as const;
    }, { maxWait: 10000, timeout: 30000 });
    if (result === "forbidden") { await recordDenied("USER_UPDATED", user.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
    if (result === "missing") { await failure("NOT_FOUND"); return Response.json({ error: "Not found" }, { status: 404, headers }); }
    if (result === "lastSuperadmin" || result === "missingCredential" || result === "deleted") { await failure("CONFLICT"); return Response.json({ error: result }, { status: 409, headers }); }
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") { await failure("CONFLICT"); return Response.json({ error: "Duplicate identity" }, { status: 409, headers }); }
    await failure("UNAVAILABLE");
    return Response.json({ error: "Unable to update user" }, { status: 503, headers });
  }
}

async function setDeleted(request: Request, { params }: Context, restore: boolean) {
  const event = restore ? "USER_RESTORED" : "USER_DELETED";
  const actor = await getAuthorizedUser("users:manage");
  if (!actor || request.headers.get("origin") !== new URL(request.url).origin) { await recordDenied(event, actor?.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  const { userId } = await params;
  if (!userId || userId.length > 191) { await writeAudit(prisma, { actorId: actor.id, event, outcome: "FAILURE", metadata: { reason: "INVALID_INPUT" } }); return Response.json({ error: "Invalid user" }, { status: 400, headers }); }
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM User ORDER BY id FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id: actor.id }, select: { role: true, isActive: true, deletedAt: true } });
    const target = await tx.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true, deletedAt: true } });
    if (!current?.isActive || current.deletedAt || !hasPermission(current.role, "users:manage")) return "forbidden";
    if (!target) return "missing";
    if (current.role !== "SUPERADMIN" && target.role === "SUPERADMIN") return "forbidden";
    if (!restore && actor.id === userId) return "self";
    if (restore ? !target.deletedAt : Boolean(target.deletedAt)) return "conflict";
    if (!restore && target.role === "SUPERADMIN" && target.isActive && await tx.user.count({ where: { role: "SUPERADMIN", isActive: true, deletedAt: null } }) <= 1) return "lastSuperadmin";
    await tx.user.update({ where: { id: userId }, data: { deletedAt: restore ? null : new Date(), isActive: false } });
    if (!restore) await tx.session.deleteMany({ where: { userId } });
    await tx.userManagementAudit.create({ data: { actorId: actor.id, targetId: userId, action: restore ? "RESTORE" : "DELETE", details: { role: target.role } } });
    await writeAudit(tx, { actorId: actor.id, event, outcome: "SUCCESS", targetType: "USER", targetId: userId, metadata: { role: target.role, previousActive: target.isActive, active: false } });
    return "ok";
  }, { maxWait: 10000, timeout: 30000 });
  if (result === "forbidden") { await recordDenied(event, actor.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  if (result === "missing") { await writeAudit(prisma, { actorId: actor.id, event, outcome: "FAILURE", metadata: { reason: "NOT_FOUND" } }); return Response.json({ error: "Not found" }, { status: 404, headers }); }
  if (result !== "ok") { await writeAudit(prisma, { actorId: actor.id, event, outcome: "FAILURE", metadata: { reason: "CONFLICT" } }); return Response.json({ error: result }, { status: 409, headers }); }
  return Response.json({ ok: true }, { headers });
}
export async function DELETE(request: Request, context: Context) { return setDeleted(request, context, false); }
export async function POST(request: Request, context: Context) { return setDeleted(request, context, true); }
