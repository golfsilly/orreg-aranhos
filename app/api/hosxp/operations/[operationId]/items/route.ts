import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { writeAudit } from "@/lib/audit/write";
import { getHosxpOperationItems } from "@/lib/hosxp/operations";
import { prisma } from "@/lib/prisma";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ operationId: string }> },
) {
  const user = await getAuthorizedUser("register:read");
  if (!user) {
    await recordDenied("HOSXP_OPERATION_ITEMS_READ");
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }

  const { operationId } = await params;
  if (!/^[1-9]\d*$/.test(operationId) || !Number.isSafeInteger(Number(operationId))) {
    return Response.json({ error: "Invalid operation ID" }, { status: 400, headers });
  }

  try {
    const operations = await getHosxpOperationItems(Number(operationId));
    await writeAudit(prisma, {
      actorId: user.id,
      event: "HOSXP_OPERATION_ITEMS_READ",
      outcome: "SUCCESS",
      targetType: "HOSXP_OPERATION",
      targetId: operationId,
      metadata: { total: operations.length },
    });
    return Response.json({ operations }, { headers });
  } catch {
    await writeAudit(prisma, {
      actorId: user.id,
      event: "HOSXP_OPERATION_ITEMS_READ",
      outcome: "FAILURE",
      targetType: "HOSXP_OPERATION",
      targetId: operationId,
    });
    return Response.json({ error: "HOSxP is unavailable" }, { status: 503, headers });
  }
}
