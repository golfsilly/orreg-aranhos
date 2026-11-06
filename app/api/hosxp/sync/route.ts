import { getAuthorizedUser } from "@/lib/authorization";
import { dayRange } from "@/lib/hosxp/date-range";
import { syncHosxpDay } from "@/lib/register/sync";

const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const user = await getAuthorizedUser("register:write");
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid origin" }, { status: 403, headers });
  }
  let date: unknown;
  try { date = (await request.json()).date; } catch {
    return Response.json({ error: "Invalid request" }, { status: 400, headers });
  }
  if (typeof date !== "string") return Response.json({ error: "Invalid date" }, { status: 400, headers });
  try { dayRange(date); } catch {
    return Response.json({ error: "Invalid date" }, { status: 400, headers });
  }
  try {
    return Response.json(await syncHosxpDay(date, user.id), { headers });
  } catch {
    return Response.json({ error: "Sync unavailable" }, { status: 503, headers });
  }
}
