import { getAuthorizedUser } from "@/lib/authorization";
import { normalizeOperationId } from "@/lib/hosxp/operation-id";
import { prisma } from "@/lib/prisma";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ operationId: string }> }) {
  if (!await getAuthorizedUser("register:read")) return Response.json({ error: "Forbidden" }, { status: 403, headers });
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
  return Response.json({ changes }, { headers });
}
