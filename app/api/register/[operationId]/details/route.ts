import { getAuthorizedUser } from "@/lib/authorization";
import { normalizeOperationId } from "@/lib/hosxp/operation-id";
import { prisma } from "@/lib/prisma";
import { parseRegisterDetails } from "@/lib/register/details";
import { z } from "zod";
import { writeAudit } from "@/lib/audit/write";
import { recordDenied } from "@/lib/audit/denied";
import { getHosxpOperationItems } from "@/lib/hosxp/operations";

const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ operationId: string }> };
const select = { id: true, revision: true, patho: true, preOp: true, postOp: true, anesthesia: true, urgency: true, surgeryClass: true, minorPeriod: true, diagnosis: true, remark: true } as const;

function getId(value: string): string | null {
  try { return normalizeOperationId(value); } catch { return null; }
}

export async function GET(_request: Request, { params }: Context) {
  const user = await getAuthorizedUser("register:read");
  if (!user) { await recordDenied("REGISTER_DETAILS_READ"); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  const id = getId((await params).operationId);
  if (!id) return Response.json({ error: "Invalid operation ID" }, { status: 400, headers });
  const register = await prisma.surgeryRegister.findUnique({ where: { hosxpOperationId: id }, select });
  if (register) await writeAudit(prisma, { actorId: user.id, event: "REGISTER_DETAILS_READ", outcome: "SUCCESS", targetType: "REGISTER", targetId: register.id });
  if (!register) return Response.json({ error: "Not found" }, { status: 404, headers });
  const operations = await getHosxpOperationItems(Number(id));
  return Response.json({ ...register, diagnosis: register.diagnosis ?? "", remark: register.remark ?? "", operations }, { headers });
}

export async function PATCH(request: Request, { params }: Context) {
  const user = await getAuthorizedUser("register:write");
  if (!user || request.headers.get("origin") !== new URL(request.url).origin) { await recordDenied("REGISTER_DETAILS_UPDATED", user?.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  const failure = async (reason: "INVALID_INPUT" | "CONFLICT" | "NOT_FOUND") => writeAudit(prisma, { actorId: user.id, event: "REGISTER_DETAILS_UPDATED", outcome: "FAILURE", metadata: { reason } });
  const id = getId((await params).operationId);
  if (!id) { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid operation ID" }, { status: 400, headers }); }
  let body: unknown;
  try { body = await request.json(); } catch { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const payload = z.object({ revision: z.number().int().nonnegative(), details: z.unknown() }).safeParse(body);
  if (!payload.success) { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid revision" }, { status: 400, headers }); }
  let details;
  try { details = parseRegisterDetails(payload.data.details); } catch { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid details" }, { status: 400, headers }); }
  const revision = payload.data.revision;
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.surgeryRegister.findUnique({ where: { hosxpOperationId: id }, select });
    if (!current) return "missing" as const;
    const savedDetails = { ...details, urgency: current.urgency };
    const updated = await tx.surgeryRegister.updateMany({ where: { id: current.id, revision }, data: { ...savedDetails, revision: { increment: 1 } } });
    if (!updated.count) return "conflict" as const;
    const before = { patho: current.patho, preOp: current.preOp, postOp: current.postOp, anesthesia: current.anesthesia, urgency: current.urgency, surgeryClass: current.surgeryClass, minorPeriod: current.minorPeriod, diagnosis: current.diagnosis ?? "", remark: current.remark ?? "" };
    await tx.surgeryRegisterDetailChange.create({ data: { registerId: current.id, changedById: user.id, before, after: savedDetails } });
    await writeAudit(tx, { actorId: user.id, event: "REGISTER_DETAILS_UPDATED", outcome: "SUCCESS", targetType: "REGISTER", targetId: current.id, metadata: { revision: revision + 1 } });
    return "ok" as const;
  });
  if (result === "missing") { await failure("NOT_FOUND"); return Response.json({ error: "Not found" }, { status: 404, headers }); }
  if (result === "conflict") { await failure("CONFLICT"); return Response.json({ error: "Record changed" }, { status: 409, headers }); }
  return Response.json({ ok: true, revision: revision + 1 }, { headers });
}
