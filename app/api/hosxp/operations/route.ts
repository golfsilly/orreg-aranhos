import { getAuthorizedUser } from "@/lib/authorization";
import { dayRange } from "@/lib/hosxp/date-range";
import { getHosxpOperationsForDay } from "@/lib/hosxp/operations";
import { normalizeOperationId } from "@/lib/hosxp/operation-id";
import { prisma } from "@/lib/prisma";
import { fiscalPeriod, formatRegisterNumber } from "@/lib/register/fiscal-period";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (!await getAuthorizedUser("register:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }
  const day = new URL(request.url).searchParams.get("date") ?? "";
  try { dayRange(day); } catch {
    return Response.json({ error: "Invalid date" }, { status: 400, headers });
  }
  try {
    const rows = await getHosxpOperationsForDay(day);
    const ids = [...new Set(rows.map((row) => normalizeOperationId(row.operation_id)))];
    const registers = await prisma.surgeryRegister.findMany({ where: { hosxpOperationId: { in: ids } }, select: { hosxpOperationId: true, sequence: true, calendarMonth: true, fiscalYear: true, operationDate: true, urgency: true, surgeryClass: true } });
    const byId = new Map(registers.map((entry) => [entry.hosxpOperationId, entry]));
    const period = fiscalPeriod(day);
    const operations = rows.map((row) => {
      const register = byId.get(normalizeOperationId(row.operation_id));
      return { ...row, registerNumber: register ? formatRegisterNumber(register.sequence, register.calendarMonth) : null, fiscalYear: register?.fiscalYear ?? null, registerUrgency: register?.urgency ?? null, surgeryClass: register?.surgeryClass ?? null, needsDateSync: Boolean(register && (register.operationDate.toISOString().slice(0, 10) !== day || register.fiscalYear !== period.fiscalYear || register.calendarMonth !== period.calendarMonth)) };
    });
    return new Response(JSON.stringify({ operations }, (_, value) => typeof value === "bigint" ? value.toString() : value), {
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
    });
  } catch {
    return Response.json({ error: "HOSxP is unavailable" }, { status: 503, headers });
  }
}
