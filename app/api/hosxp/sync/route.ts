import { getAuthorizedUser } from "@/lib/authorization";
import { dayRange } from "@/lib/hosxp/date-range";
import { syncHosxpDay } from "@/lib/register/sync";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit/write";
import { recordDenied } from "@/lib/audit/denied";
import { hasTrustedRequestOrigin } from "@/lib/security/request-origin";

const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const user = await getAuthorizedUser("register:write");
  if (!user) { await recordDenied("HOSXP_SYNC"); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  if (!hasTrustedRequestOrigin(request)) {
    await recordDenied("HOSXP_SYNC", user.id);
    return Response.json({ error: "Invalid origin" }, { status: 403, headers });
  }
  const invalid = async () => writeAudit(prisma, { actorId: user.id, event: "HOSXP_SYNC", outcome: "FAILURE", metadata: { reason: "INVALID_INPUT" } });
  let body: unknown;
  try { body = await request.json(); } catch {
    await invalid();
    return Response.json({ error: "Invalid request" }, { status: 400, headers });
  }
  const payload = z.object({ date: z.iso.date() }).safeParse(body);
  if (!payload.success) { await invalid(); return Response.json({ error: "Invalid date" }, { status: 400, headers }); }
  const date = payload.data.date;
  try { dayRange(date); } catch {
    await invalid();
    return Response.json({ error: "Invalid date" }, { status: 400, headers });
  }
  try {
    return Response.json(await syncHosxpDay(date, user.id), { headers });
  } catch {
    await writeAudit(prisma, { actorId: user.id, event: "HOSXP_SYNC", outcome: "FAILURE", targetType: "HOSXP_DAY", targetId: date, metadata: { date, reason: "UNAVAILABLE" } });
    return Response.json({ error: "Sync unavailable" }, { status: 503, headers });
  }
}
