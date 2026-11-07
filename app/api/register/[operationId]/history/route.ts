import { getAuthorizedUser } from "@/lib/authorization";
import { normalizeOperationId } from "@/lib/hosxp/operation-id";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit/write";
import { recordDenied } from "@/lib/audit/denied";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ operationId: string }> }) {
  const user = await getAuthorizedUser("register:read");
  if (!user) { await recordDenied("REGISTER_HISTORY_READ"); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  let id: string;
  try { id = normalizeOperationId((await params).operationId); }
  catch { return Response.json({ error: "Invalid operation ID" }, { status: 400, headers }); }
  const register = await prisma.surgeryRegister.findUnique({ where: { hosxpOperationId: id }, select: { id: true } });
  if (!register) return Response.json({ error: "Not found" }, { status: 404, headers });
  const changes = await prisma.surgeryRegisterNumberChange.findMany({
    where: { registerId: register.id },
    select: { id: true, changedAt: true, before: true, after: true, changedBy: { select: { name: true } } },
    orderBy: [{ changedAt: "desc" }, { id: "desc" }],
  });
  const revision = (value: unknown) => value && typeof value === "object" && "revision" in value && typeof value.revision === "number" ? value.revision : -1;
  changes.sort((left, right) => revision(right.after) - revision(left.after));
  await writeAudit(prisma, { actorId: user.id, event: "REGISTER_HISTORY_READ", outcome: "SUCCESS", targetType: "REGISTER", targetId: register.id, metadata: { total: changes.length } });
  return Response.json({ changes }, { headers });
}
