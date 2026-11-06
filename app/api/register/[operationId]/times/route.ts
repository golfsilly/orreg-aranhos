import { getAuthorizedUser } from "@/lib/authorization";
import { normalizeOperationId } from "@/lib/hosxp/operation-id";
import { prisma } from "@/lib/prisma";
import { parseRegisterTimes, timeFields, type RegisterTimes } from "@/lib/register/times";

const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ operationId: string }> };
const selection = { id: true, revision: true, roomEnteredAt: true, operationStartedAt: true, operationEndedAt: true, roomExitedAt: true } as const;

function getId(value: string): string | null {
  try { return normalizeOperationId(value); } catch { return null; }
}

export async function GET(_request: Request, { params }: Context) {
  if (!await getAuthorizedUser("register:read")) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  const id = getId((await params).operationId);
  if (!id) return Response.json({ error: "Invalid operation ID" }, { status: 400, headers });
  const register = await prisma.surgeryRegister.findUnique({ where: { hosxpOperationId: id }, select: selection });
  return register ? Response.json(register, { headers }) : Response.json({ error: "Not found" }, { status: 404, headers });
}

export async function PATCH(request: Request, { params }: Context) {
  const user = await getAuthorizedUser("register:write");
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin" }, { status: 403, headers });
  const id = getId((await params).operationId);
  if (!id) return Response.json({ error: "Invalid operation ID" }, { status: 400, headers });
  let payload: { revision?: unknown; times?: unknown };
  try { payload = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  if (!payload || !Number.isSafeInteger(payload.revision) || (payload.revision as number) < 0) return Response.json({ error: "Invalid revision" }, { status: 400, headers });
  let times;
  try { times = parseRegisterTimes(payload.times); } catch { return Response.json({ error: "Invalid or out-of-order times" }, { status: 400, headers }); }
  const revision = payload.revision as number;
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.surgeryRegister.findUnique({ where: { hosxpOperationId: id }, select: selection });
    if (!current) return "missing" as const;
    const updated = await tx.surgeryRegister.updateMany({ where: { id: current.id, revision }, data: { ...times, revision: { increment: 1 } } });
    if (!updated.count) return "conflict" as const;
    const snapshot = (source: RegisterTimes) => Object.fromEntries(timeFields.map((field) => [field, source[field]?.toISOString() ?? null]));
    await tx.surgeryRegisterTimeChange.create({ data: { registerId: current.id, changedById: user.id, before: snapshot(current), after: snapshot(times) } });
    return "ok" as const;
  });
  if (result === "missing") return Response.json({ error: "Not found" }, { status: 404, headers });
  if (result === "conflict") return Response.json({ error: "Record changed" }, { status: 409, headers });
  return Response.json({ ok: true, revision: revision + 1 }, { headers });
}
