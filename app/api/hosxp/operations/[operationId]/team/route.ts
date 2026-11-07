import { getAuthorizedUser } from "@/lib/authorization";
import { getHosxpOperationTeam } from "@/lib/hosxp/operations";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit/write";
import { recordDenied } from "@/lib/audit/denied";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ operationId: string }> }) {
  const user = await getAuthorizedUser("register:read");
  if (!user) {
    await recordDenied("HOSXP_TEAM_READ");
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }
  const { operationId } = await params;
  if (!/^[1-9]\d*$/.test(operationId) || !Number.isSafeInteger(Number(operationId))) {
    return Response.json({ error: "Invalid operation ID" }, { status: 400, headers });
  }
  try {
    const team = await getHosxpOperationTeam(Number(operationId));
    await writeAudit(prisma, { actorId: user.id, event: "HOSXP_TEAM_READ", outcome: "SUCCESS", targetType: "HOSXP_OPERATION", targetId: operationId, metadata: { total: team.length } });
    return new Response(JSON.stringify({ team }, (_, value) => typeof value === "bigint" ? value.toString() : value), {
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
    });
  } catch {
    await writeAudit(prisma, { actorId: user.id, event: "HOSXP_TEAM_READ", outcome: "FAILURE", targetType: "HOSXP_OPERATION", targetId: operationId });
    return Response.json({ error: "HOSxP is unavailable" }, { status: 503, headers });
  }
}
