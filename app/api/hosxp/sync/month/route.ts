import { z } from "zod";
import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { monthRange } from "@/lib/hosxp/date-range";
import { getHosxpOperationsForMonth } from "@/lib/hosxp/operations";
import { prisma } from "@/lib/prisma";
import { fiscalPeriod } from "@/lib/register/fiscal-period";
import { syncHosxpDay } from "@/lib/register/sync";
import { writeAudit } from "@/lib/audit/write";

const requestSchema = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) });
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const user = await getAuthorizedUser("register:write");
  if (!user) {
    await recordDenied("HOSXP_SYNC");
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }

  let month: string;
  try {
    const body = requestSchema.parse(await request.json());
    monthRange(body.month);
    month = body.month;
  } catch {
    return Response.json({ error: "Invalid month" }, { status: 400, headers });
  }

  try {
    const [start] = monthRange(month);
    const sourceRows = await getHosxpOperationsForMonth(month);
    const days = [...new Set(sourceRows.map((row) => typeof row.request_operation_date === "string" ? row.request_operation_date.slice(0, 10) : ""))]
      .filter((day) => day >= start && day.startsWith(month))
      .sort();
    const totals = { total: 0, created: 0, renumbered: 0, dateUpdated: 0, departmentUpdated: 0, existing: 0 };
    for (const day of days) {
      const result = await syncHosxpDay(day, user.id);
      for (const key of Object.keys(totals) as (keyof typeof totals)[]) totals[key] += result[key];
    }
    const period = fiscalPeriod(`${month}-01`);
    await prisma.$transaction((tx) => writeAudit(tx, { actorId: user.id, event: "HOSXP_SYNC", outcome: "SUCCESS", targetType: "HOSXP_MONTH", targetId: month, metadata: { calendarMonth: period.calendarMonth, fiscalYear: period.fiscalYear, ...totals } }));
    return Response.json({ month, days: days.length, ...totals }, { headers });
  } catch {
    const period = fiscalPeriod(`${month}-01`);
    try {
      await prisma.$transaction((tx) => writeAudit(tx, { actorId: user.id, event: "HOSXP_SYNC", outcome: "FAILURE", targetType: "HOSXP_MONTH", targetId: month, metadata: { calendarMonth: period.calendarMonth, fiscalYear: period.fiscalYear } }));
    } catch { /* Keep database details out of the response and central audit trail. */ }
    return Response.json({ error: "HOSXP_UNAVAILABLE" }, { status: 503, headers });
  }
}
