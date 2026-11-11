import { getAuthorizedUser } from "@/lib/authorization";
import { normalizeOperationId } from "@/lib/hosxp/operation-id";
import { prisma } from "@/lib/prisma";
import { parseRegisterTimes, timeFields, type RegisterTimes } from "@/lib/register/times";
import { z } from "zod";
import { writeAudit } from "@/lib/audit/write";
import { recordDenied } from "@/lib/audit/denied";
import { hasTrustedRequestOrigin } from "@/lib/security/request-origin";

const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ operationId: string }> };
const selection = { id: true, revision: true, roomEnteredAt: true, operationStartedAt: true, operationEndedAt: true, roomExitedAt: true } as const;

function getId(value: string): string | null {
  try { return normalizeOperationId(value); } catch { return null; }
}

export async function GET(_request: Request, { params }: Context) {
  const user = await getAuthorizedUser("register:read");
  if (!user) { await recordDenied("REGISTER_TIMES_READ"); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  const id = getId((await params).operationId);
  if (!id) return Response.json({ error: "Invalid operation ID" }, { status: 400, headers });
  const register = await prisma.surgeryRegister.findUnique({ where: { hosxpOperationId: id }, select: selection });
  if (register) await writeAudit(prisma, { actorId: user.id, event: "REGISTER_TIMES_READ", outcome: "SUCCESS", targetType: "REGISTER", targetId: register.id });
  return register ? Response.json(register, { headers }) : Response.json({ error: "Not found" }, { status: 404, headers });
}

export async function PATCH(request: Request, { params }: Context) {
  const user = await getAuthorizedUser("register:write");
  if (!user) { await recordDenied("REGISTER_TIMES_UPDATED"); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  if (!hasTrustedRequestOrigin(request)) { await recordDenied("REGISTER_TIMES_UPDATED", user.id); return Response.json({ error: "Invalid origin" }, { status: 403, headers }); }
  const failure = async (reason: "INVALID_INPUT" | "CONFLICT" | "NOT_FOUND") => writeAudit(prisma, { actorId: user.id, event: "REGISTER_TIMES_UPDATED", outcome: "FAILURE", metadata: { reason } });
  const id = getId((await params).operationId);
  if (!id) { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid operation ID" }, { status: 400, headers }); }
  let body: unknown;
  try { body = await request.json(); } catch { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const payload = z.object({
    revision: z.number().int().nonnegative(),
    times: z.unknown(),
    useHosxpTimes: z.object({ operationStartedAt: z.boolean().optional(), operationEndedAt: z.boolean().optional() }).optional(),
  }).strict().safeParse(body);
  if (!payload.success) { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid revision" }, { status: 400, headers }); }
  let times;
  try { times = parseRegisterTimes(payload.data.times); } catch { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid or out-of-order times" }, { status: 400, headers }); }
  const revision = payload.data.revision;
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.surgeryRegister.findUnique({ where: { hosxpOperationId: id }, select: selection });
    if (!current) return "missing" as const;
    const nextTimes = {
      ...times,
      ...(payload.data.useHosxpTimes?.operationStartedAt ? { operationStartedAt: null } : {}),
      ...(payload.data.useHosxpTimes?.operationEndedAt ? { operationEndedAt: null } : {}),
    };
    const updated = await tx.surgeryRegister.updateMany({ where: { id: current.id, revision }, data: { ...nextTimes, revision: { increment: 1 } } });
    if (!updated.count) return "conflict" as const;
    const snapshot = (source: RegisterTimes) => Object.fromEntries(timeFields.map((field) => [field, source[field]?.toISOString() ?? null]));
    await tx.surgeryRegisterTimeChange.create({ data: { registerId: current.id, changedById: user.id, before: snapshot(current), after: snapshot(nextTimes) } });
    await writeAudit(tx, { actorId: user.id, event: "REGISTER_TIMES_UPDATED", outcome: "SUCCESS", targetType: "REGISTER", targetId: current.id, metadata: { revision: revision + 1 } });
    return "ok" as const;
  });
  if (result === "missing") { await failure("NOT_FOUND"); return Response.json({ error: "Not found" }, { status: 404, headers }); }
  if (result === "conflict") { await failure("CONFLICT"); return Response.json({ error: "Record changed" }, { status: 409, headers }); }
  return Response.json({ ok: true, revision: revision + 1 }, { headers });
}
