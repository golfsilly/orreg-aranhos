import { getAuthorizedUser } from "@/lib/authorization";
import { normalizeOperationId } from "@/lib/hosxp/operation-id";
import { getHosxpOperationItems } from "@/lib/hosxp/operations";
import { prisma } from "@/lib/prisma";
import { parseRegisterDetails } from "@/lib/register/details";
import { z } from "zod";
import { writeAudit } from "@/lib/audit/write";
import { recordDenied } from "@/lib/audit/denied";
import { hasTrustedRequestOrigin } from "@/lib/security/request-origin";

const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ operationId: string }> };
const select = { id: true, revision: true, patho: true, preOp: true, postOp: true, anesthesia: true, urgency: true, surgeryClass: true, minorPeriod: true, diagnosis: true, remark: true, pathoItems: { select: { operationDetailId: true, operationItemId: true, operationItemName: true } } } as const;

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
  return Response.json({
    ...register,
    pathoOperationDetailIds: register.pathoItems.map((item) => item.operationDetailId),
    legacyPatho: register.patho && register.pathoItems.length === 0,
    diagnosis: register.diagnosis ?? "",
    remark: register.remark ?? "",
  }, { headers });
}

export async function PATCH(request: Request, { params }: Context) {
  const user = await getAuthorizedUser("register:write");
  if (!user || !hasTrustedRequestOrigin(request)) { await recordDenied("REGISTER_DETAILS_UPDATED", user?.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  const failure = async (reason: "INVALID_INPUT" | "CONFLICT" | "NOT_FOUND" | "UNAVAILABLE") => writeAudit(prisma, { actorId: user.id, event: "REGISTER_DETAILS_UPDATED", outcome: "FAILURE", metadata: { reason } });
  const id = getId((await params).operationId);
  if (!id) { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid operation ID" }, { status: 400, headers }); }
  let body: unknown;
  try { body = await request.json(); } catch { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const payload = z.object({ revision: z.number().int().nonnegative(), details: z.unknown() }).safeParse(body);
  if (!payload.success) { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid revision" }, { status: 400, headers }); }
  let details;
  try { details = parseRegisterDetails(payload.data.details); } catch { await failure("INVALID_INPUT"); return Response.json({ error: "Invalid details" }, { status: 400, headers }); }
  const revision = payload.data.revision;
  const currentPatho = await prisma.surgeryRegister.findUnique({
    where: { hosxpOperationId: id },
    select: {
      id: true,
      revision: true,
      pathoItems: {
        select: {
          operationDetailId: true,
          operationItemId: true,
          operationItemName: true,
        },
      },
    },
  });
  if (!currentPatho) { await failure("NOT_FOUND"); return Response.json({ error: "Not found" }, { status: 404, headers }); }
  const existingPathoById = new Map(currentPatho.pathoItems.map((item) => [item.operationDetailId, item]));
  let hosxpItems = new Map<number, { operationItemId: number | null; operationItemName: string }>();
  const newPathoIds = details.pathoOperationDetailIds.filter((detailId) => !existingPathoById.has(detailId));
  if (newPathoIds.length) {
    try {
      const sourceItems = await getHosxpOperationItems(Number(id));
      hosxpItems = new Map(sourceItems.map((item) => [item.operationDetailId, {
        operationItemId: item.operationItemId,
        operationItemName: item.operationItemName,
      }]));
    } catch {
      await failure("UNAVAILABLE");
      return Response.json({ error: "HOSxP is unavailable; pathology selections were not saved" }, { status: 503, headers });
    }
    if (newPathoIds.some((detailId) => !hosxpItems.has(detailId))) {
      await failure("INVALID_INPUT");
      return Response.json({ error: "Unknown HOSxP operation item" }, { status: 400, headers });
    }
  }
  const pathoRows = details.pathoOperationDetailIds.map((operationDetailId) => {
    const item = hosxpItems.get(operationDetailId) ?? existingPathoById.get(operationDetailId);
    return item ? {
      registerId: currentPatho.id,
      operationDetailId,
      operationItemId: item.operationItemId,
      operationItemName: item.operationItemName,
    } : null;
  }).filter((item) => item !== null);
  if (pathoRows.length !== details.pathoOperationDetailIds.length) {
    await failure("INVALID_INPUT");
    return Response.json({ error: "Unknown HOSxP operation item" }, { status: 400, headers });
  }
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.surgeryRegister.findUnique({ where: { hosxpOperationId: id }, select });
    if (!current) return "missing" as const;
    if (current.revision !== revision) return "conflict" as const;
    const { pathoOperationDetailIds, ...inputDetails } = details;
    const legacyPatho = current.patho && current.pathoItems.length === 0;
    const savedDetails = { ...inputDetails, patho: pathoOperationDetailIds.length > 0 || legacyPatho, urgency: current.urgency };
    const updated = await tx.surgeryRegister.updateMany({ where: { id: current.id, revision }, data: { ...savedDetails, revision: { increment: 1 } } });
    if (!updated.count) return "conflict" as const;
    await tx.surgeryRegisterPathoItem.deleteMany({ where: { registerId: current.id } });
    if (pathoRows.length) await tx.surgeryRegisterPathoItem.createMany({ data: pathoRows });
    const before = { patho: current.patho, pathoOperationDetailIds: current.pathoItems.map((item) => item.operationDetailId), preOp: current.preOp, postOp: current.postOp, anesthesia: current.anesthesia, urgency: current.urgency, surgeryClass: current.surgeryClass, minorPeriod: current.minorPeriod, diagnosis: current.diagnosis ?? "", remark: current.remark ?? "" };
    await tx.surgeryRegisterDetailChange.create({ data: { registerId: current.id, changedById: user.id, before, after: { ...savedDetails, pathoOperationDetailIds } } });
    await writeAudit(tx, { actorId: user.id, event: "REGISTER_DETAILS_UPDATED", outcome: "SUCCESS", targetType: "REGISTER", targetId: current.id, metadata: { revision: revision + 1 } });
    return "ok" as const;
  });
  if (result === "missing") { await failure("NOT_FOUND"); return Response.json({ error: "Not found" }, { status: 404, headers }); }
  if (result === "conflict") { await failure("CONFLICT"); return Response.json({ error: "Record changed" }, { status: 409, headers }); }
  return Response.json({ ok: true, revision: revision + 1 }, { headers });
}
