import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { writeAudit } from "@/lib/audit/write";
import { prisma } from "@/lib/prisma";
import { selfProfileSchema, workFieldNames } from "@/lib/user-profile";

const headers = { "Cache-Control": "private, no-store" };
export async function PATCH(request: Request) {
  const actor = await getAuthorizedUser("dashboard:read");
  if (!actor || request.headers.get("origin") !== new URL(request.url).origin) { await recordDenied("PROFILE_UPDATED", actor?.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  let body: unknown;
  try { body = await request.json(); } catch { await writeAudit(prisma, { actorId: actor.id, event: "PROFILE_UPDATED", outcome: "FAILURE", metadata: { reason: "INVALID_INPUT" } }); return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const parsed = selfProfileSchema.safeParse(body);
  if (!parsed.success) { await writeAudit(prisma, { actorId: actor.id, event: "PROFILE_UPDATED", outcome: "FAILURE", metadata: { reason: "INVALID_INPUT" } }); return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${actor.id} FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id: actor.id }, select: { isActive: true, deletedAt: true, name: true, organization: true, mission: true, workGroup: true, jobTitle: true, jobLevel: true } });
    if (!current?.isActive || current.deletedAt) return false;
    const data = parsed.data;
    await tx.user.update({ where: { id: actor.id }, data });
    await writeAudit(tx, { actorId: actor.id, event: "PROFILE_UPDATED", outcome: "SUCCESS", targetType: "USER", targetId: actor.id, metadata: { nameChanged: current.name !== data.name, workDetailsChanged: workFieldNames.some((field) => data[field] !== undefined && data[field] !== current[field]) } });
    return true;
  });
  if (!result) { await recordDenied("PROFILE_UPDATED", actor.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  return Response.json({ ok: true }, { headers });
}
