import { getAuthorizedUser } from "@/lib/authorization";
import { dayRange, monthRange } from "@/lib/hosxp/date-range";
import { getHosxpOperatingRooms, getHosxpOperationsForDay, getHosxpOperationsForMonth } from "@/lib/hosxp/operations";
import { normalizeOperationId } from "@/lib/hosxp/operation-id";
import { prisma } from "@/lib/prisma";
import { fiscalPeriod, formatRegisterNumber } from "@/lib/register/fiscal-period";
import { writeAudit } from "@/lib/audit/write";
import { recordDenied } from "@/lib/audit/denied";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const user = await getAuthorizedUser("register:read");
  if (!user) {
    await recordDenied("HOSXP_OPERATIONS_READ");
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }
  const params = new URL(request.url).searchParams;
  const day = params.get("date") ?? "";
  const month = params.get("month") ?? "";
  if (Boolean(day) === Boolean(month)) return Response.json({ error: "Provide exactly one of date or month" }, { status: 400, headers });
  try { if (month) monthRange(month); else dayRange(day); } catch {
    return Response.json({ error: "Invalid date or month" }, { status: 400, headers });
  }
  try {
    const [rows, rooms] = await Promise.all([
      month ? getHosxpOperationsForMonth(month) : getHosxpOperationsForDay(day),
      month ? getHosxpOperatingRooms() : Promise.resolve([]),
    ]);
    const ids = [...new Set(rows.map((row) => normalizeOperationId(row.operation_id)))];
    const registers = await prisma.surgeryRegister.findMany({ where: { hosxpOperationId: { in: ids } }, select: { hosxpOperationId: true, sequence: true, calendarMonth: true, fiscalYear: true, departmentId: true, operationDate: true, urgency: true, surgeryClass: true, roomEnteredAt: true, roomExitedAt: true, patho: true, preOp: true, postOp: true, anesthesia: true, minorPeriod: true, diagnosis: true, remark: true } });
    const byId = new Map(registers.map((entry) => [entry.hosxpOperationId, entry]));
    const targetType = month ? "HOSXP_MONTH" : "HOSXP_DAY";
    const operations = rows.map((row) => {
      const register = byId.get(normalizeOperationId(row.operation_id));
      const sourceDate = typeof row.request_operation_date === "string" ? row.request_operation_date.slice(0, 10) : day || `${month}-01`;
      const period = fiscalPeriod(sourceDate);
      const sourceDepartmentId = row.spclty == null || String(row.spclty).trim() === "" ? "UNSPECIFIED" : String(row.spclty).trim();
      const departmentName = typeof row.department_name === "string" && row.department_name.trim() ? row.department_name.trim() : "ไม่ระบุแผนก";
      const needsDateSync = Boolean(register && (register.operationDate.toISOString().slice(0, 10) !== sourceDate || register.fiscalYear !== period.fiscalYear || register.calendarMonth !== period.calendarMonth || register.departmentId !== sourceDepartmentId));
      return {
        ...row,
        sourceRoomId: row.room_id == null ? "UNSPECIFIED" : String(row.room_id),
        sourceDepartmentId,
        departmentName,
        registerDepartmentId: register?.departmentId ?? null,
        sourceAge: row.age_text ?? null,
        effectiveAge: row.age_text ?? null,
        sourceOperationStartedAt: row.operation_started_at ?? null,
        sourceOperationEndedAt: row.operation_ended_at ?? null,
        effectiveOperationStartedAt: row.operation_started_at ?? null,
        effectiveOperationEndedAt: row.operation_ended_at ?? null,
        roomEnteredAt: register?.roomEnteredAt ?? null,
        roomExitedAt: register?.roomExitedAt ?? null,
        registerNumber: register && !needsDateSync ? formatRegisterNumber(register.sequence, register.calendarMonth) : null,
        fiscalYear: register?.fiscalYear ?? null,
        registerUrgency: row.emergency_name ?? register?.urgency ?? null,
        surgeryClass: register?.surgeryClass ?? null,
        patho: register?.patho ?? false,
        preOp: register?.preOp ?? false,
        postOp: register?.postOp ?? false,
        anesthesia: register?.anesthesia ?? null,
        minorPeriod: register?.minorPeriod ?? null,
        remark: register?.remark ?? "",
        diagnosis: register?.diagnosis ?? "",
        needsDateSync,
      };
    });
    const auditMetadata = month ? { calendarMonth: Number(month.slice(5, 7)), fiscalYear: fiscalPeriod(`${month}-01`).fiscalYear, total: operations.length } : { date: day, total: operations.length };
    await writeAudit(prisma, { actorId: user.id, event: "HOSXP_OPERATIONS_READ", outcome: "SUCCESS", targetType, targetId: month || day, metadata: auditMetadata });
    return new Response(JSON.stringify({ operations, rooms }, (_, value) => typeof value === "bigint" ? value.toString() : value), {
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
    });
  } catch {
    await writeAudit(prisma, { actorId: user.id, event: "HOSXP_OPERATIONS_READ", outcome: "FAILURE", targetType: month ? "HOSXP_MONTH" : "HOSXP_DAY", targetId: month || day, metadata: month ? { calendarMonth: Number(month.slice(5, 7)), fiscalYear: fiscalPeriod(`${month}-01`).fiscalYear } : { date: day } });
    return Response.json({ error: "HOSXP_UNAVAILABLE" }, { status: 503, headers });
  }
}
