import { getAuthorizedUser } from "@/lib/authorization";
import { getHosxpOperationTeam } from "@/lib/hosxp/operations";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ operationId: string }> }) {
  if (!await getAuthorizedUser("register:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }
  const { operationId } = await params;
  if (!/^[1-9]\d*$/.test(operationId) || !Number.isSafeInteger(Number(operationId))) {
    return Response.json({ error: "Invalid operation ID" }, { status: 400, headers });
  }
  try {
    const team = await getHosxpOperationTeam(Number(operationId));
    return new Response(JSON.stringify({ team }, (_, value) => typeof value === "bigint" ? value.toString() : value), {
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
    });
  } catch {
    return Response.json({ error: "HOSxP is unavailable" }, { status: 503, headers });
  }
}
