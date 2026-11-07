import { hashPassword, verifyPassword } from "better-auth/crypto";
import { headers as requestHeaders } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { recordDenied } from "@/lib/audit/denied";
import { writeAudit } from "@/lib/audit/write";
import { passwordSchema } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";

const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await requestHeaders() });
  if (!session || request.headers.get("origin") !== new URL(request.url).origin) { await recordDenied("AUTH_PASSWORD_CHANGE", session?.user.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  let body: unknown;
  try { body = await request.json(); } catch { await writeAudit(prisma, { actorId: session.user.id, event: "AUTH_PASSWORD_CHANGE", outcome: "FAILURE", metadata: { reason: "INVALID_INPUT" } }); return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const parsed = z.object({ currentPassword: z.string().max(128), newPassword: passwordSchema }).strict().safeParse(body);
  if (!parsed.success) { await writeAudit(prisma, { actorId: session.user.id, event: "AUTH_PASSWORD_CHANGE", outcome: "FAILURE", metadata: { reason: "INVALID_INPUT" } }); return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const hashed = await hashPassword(parsed.data.newPassword);
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${session.user.id} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: session.user.id }, select: { isActive: true, deletedAt: true } });
    const liveSession = await tx.session.findFirst({ where: { id: session.session.id, userId: session.user.id, expiresAt: { gt: new Date() } }, select: { id: true } });
    if (!user?.isActive || user.deletedAt || !liveSession) return "forbidden";
    const failures = await tx.auditLog.count({ where: { actorId: session.user.id, event: "AUTH_PASSWORD_CHANGE", outcome: "FAILURE", occurredAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } } });
    if (failures >= 5) return "rateLimited";
    const account = await tx.account.findFirst({ where: { userId: session.user.id, providerId: "credential" }, select: { id: true, password: true } });
    if (!account?.password || !await verifyPassword({ hash: account.password, password: parsed.data.currentPassword })) {
      await writeAudit(tx, { actorId: session.user.id, event: "AUTH_PASSWORD_CHANGE", outcome: "FAILURE", targetType: "USER", targetId: session.user.id, metadata: { reason: "INVALID_INPUT" } });
      return account?.password ? "invalidPassword" : "missingCredential";
    }
    await tx.account.update({ where: { id: account.id }, data: { password: hashed } });
    await tx.session.deleteMany({ where: { userId: session.user.id, id: { not: session.session.id } } });
    await writeAudit(tx, { actorId: session.user.id, event: "AUTH_PASSWORD_CHANGE", outcome: "SUCCESS", targetType: "USER", targetId: session.user.id, metadata: { passwordChanged: true } });
    return "ok";
  }, { timeout: 30000 });
  if (result === "forbidden") { await recordDenied("AUTH_PASSWORD_CHANGE", session.user.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  if (result === "rateLimited") { await writeAudit(prisma, { actorId: session.user.id, event: "AUTH_PASSWORD_CHANGE", outcome: "DENIED", targetType: "USER", targetId: session.user.id }); return Response.json({ error: result }, { status: 429, headers }); }
  if (result !== "ok") return Response.json({ error: result }, { status: 400, headers });
  return Response.json({ ok: true }, { headers });
}
