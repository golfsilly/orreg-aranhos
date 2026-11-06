import { getAuthorizedUser } from "@/lib/authorization";
import { normalizeOperationId } from "@/lib/hosxp/operation-id";
import { prisma } from "@/lib/prisma";
import { parseRegisterDetails } from "@/lib/register/details";

const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ operationId: string }> };
const select = { id: true, revision: true, patho: true, preOp: true, postOp: true, anesthesia: true, urgency: true, surgeryClass: true, minorPeriod: true } as const;

function getId(value: string): string | null {
  try { return normalizeOperationId(value); } catch { return null; }
}

export async function GET(_request: Request, { params }: Context) {
  if (!await getAuthorizedUser("register:read")) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  const id = getId((await params).operationId);
  if (!id) return Response.json({ error: "Invalid operation ID" }, { status: 400, headers });
  const register = await prisma.surgeryRegister.findUnique({ where: { hosxpOperationId: id }, select });
  return register ? Response.json(register, { headers }) : Response.json({ error: "Not found" }, { status: 404, headers });
}

export async function PATCH(request: Request, { params }: Context) {
  const user = await getAuthorizedUser("register:write");
  if (!user || request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  const id = getId((await params).operationId);
  if (!id) return Response.json({ error: "Invalid operation ID" }, { status: 400, headers });
  let payload: { revision?: unknown; details?: unknown };
  try { payload = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  if (!payload || !Number.isSafeInteger(payload.revision) || (payload.revision as number) < 0) return Response.json({ error: "Invalid revision" }, { status: 400, headers });
  let details;
  try { details = parseRegisterDetails(payload.details); } catch { return Response.json({ error: "Invalid details" }, { status: 400, headers }); }
  const revision = payload.revision as number;
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.surgeryRegister.findUnique({ where: { hosxpOperationId: id }, select });
    if (!current) return "missing" as const;
    const updated = await tx.surgeryRegister.updateMany({ where: { id: current.id, revision }, data: { ...details, revision: { increment: 1 } } });
    if (!updated.count) return "conflict" as const;
    const before = { patho: current.patho, preOp: current.preOp, postOp: current.postOp, anesthesia: current.anesthesia, urgency: current.urgency, surgeryClass: current.surgeryClass, minorPeriod: current.minorPeriod };
    await tx.surgeryRegisterDetailChange.create({ data: { registerId: current.id, changedById: user.id, before, after: details } });
    return "ok" as const;
  });
  if (result === "missing") return Response.json({ error: "Not found" }, { status: 404, headers });
  if (result === "conflict") return Response.json({ error: "Record changed" }, { status: 409, headers });
  return Response.json({ ok: true, revision: revision + 1 }, { headers });
}
