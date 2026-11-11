import { loadStatistics } from "@/lib/register/statistics-service";
import { z } from "zod";
import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { writeAudit } from "@/lib/audit/write";
import { prisma } from "@/lib/prisma";
import { statisticsRange, type StatisticsPeriod } from "@/lib/register/statistics";

const requestSchema = z.object({ period: z.enum(["day", "month", "year"]), value: z.string().min(4).max(10), department: z.string().min(1).max(191).optional() });
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  const user = await getAuthorizedUser("dashboard:read");
  if (!user) {
    await recordDenied("REPORT_STATISTICS_READ");
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }

  const parsed = requestSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ error: "Invalid report period" }, { status: 400, headers });
  const { period, value, department } = parsed.data;
  try { statisticsRange(period, value); } catch { return Response.json({ error: "Invalid report period" }, { status: 400, headers }); }
  const targetId = `${period}:${value}`;

  try {
    const response = await loadStatistics(period, value, department);
    await writeAudit(prisma, { actorId: user.id, event: "REPORT_STATISTICS_READ", outcome: "SUCCESS", targetId, metadata: { total: response.totalCases, reportPeriod: response.period } });
    return Response.json(response, { headers });
  } catch {
    await writeAudit(prisma, { actorId: user.id, event: "REPORT_STATISTICS_READ", outcome: "FAILURE", targetId, metadata: { reportPeriod: period.toUpperCase() as Uppercase<StatisticsPeriod> } });
    return Response.json({ error: "Could not load report statistics" }, { status: 503, headers });
  }
}
