import { z } from "zod";
import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { writeAudit } from "@/lib/audit/write";
import { getHosxpOperationsForDateRange } from "@/lib/hosxp/operations";
import { normalizeOperationId } from "@/lib/hosxp/operation-id";
import { prisma } from "@/lib/prisma";

const headers = { "Cache-Control": "private, no-store" };
const pageSizeSchema = z.coerce.number().int().min(10).max(50).default(10);
const observed = z.object({
  phase: z.enum(["PACU_ARRIVAL", "PACU_MONITORING", "PACU_DISCHARGE"]), recordedAt: z.coerce.date().optional(),
  systolicBp: z.number().int().min(30).max(300).nullable().optional(), diastolicBp: z.number().int().min(10).max(200).nullable().optional(),
  heartRate: z.number().int().min(1).max(300).nullable().optional(), respiratoryRate: z.number().int().min(1).max(100).nullable().optional(),
  oxygenSaturation: z.number().int().min(0).max(100).nullable().optional(), temperatureC: z.number().min(25).max(45).nullable().optional(),
  painScore: z.number().int().min(0).max(10).nullable().optional(), aldreteScore: z.number().int().min(0).max(10).nullable().optional(),
  oxygenSupport: z.string().max(64).nullable().optional(), consciousness: z.string().max(64).nullable().optional(), airwayStatus: z.string().max(64).nullable().optional(),
  nausea: z.boolean().optional(), vomiting: z.boolean().optional(), note: z.string().max(4000).nullable().optional(),
});
const input = z.discriminatedUnion("type", [
  z.object({ type: z.literal("pacu"), registerId: z.string().min(1).max(191), pacuArrivedAt: z.coerce.date().nullable().optional(), pacuDischargedAt: z.coerce.date().nullable().optional(), disposition: z.enum(["WARD", "ICU", "HOME", "OTHER"]).nullable().optional(), handoffNote: z.string().max(4000).nullable().optional(), airwayStable: z.boolean().nullable().optional(), vitalSignsStable: z.boolean().nullable().optional(), painControlled: z.boolean().nullable().optional(), nauseaControlled: z.boolean().nullable().optional(), consciousnessRecovered: z.boolean().nullable().optional(), handoffComplete: z.boolean().nullable().optional() }),
  z.object({ type: z.literal("observation"), registerId: z.string().min(1).max(191), observation: observed }),
  z.object({ type: z.literal("complication"), registerId: z.string().min(1).max(191), category: z.enum(["AIRWAY", "CARDIOVASCULAR", "BLEEDING", "NAUSEA_VOMITING", "PAIN", "NEUROLOGICAL", "ALLERGIC", "OTHER"]), severity: z.enum(["MILD", "MODERATE", "SEVERE", "CRITICAL"]), occurredAt: z.coerce.date(), intervention: z.string().max(4000).nullable().optional(), outcome: z.string().max(4000).nullable().optional() }),
  z.object({ type: z.literal("resolve-complication"), registerId: z.string().min(1).max(191), complicationId: z.string().min(1).max(191), outcome: z.string().max(4000).nullable().optional() }),
  z.object({ type: z.literal("transfer"), registerId: z.string().min(1).max(191), transferredAt: z.coerce.date(), fromLocation: z.string().max(191).nullable().optional(), toLocation: z.string().min(1).max(191), transportedBy: z.string().max(191).nullable().optional(), receivedBy: z.string().max(191).nullable().optional(), handoffNote: z.string().max(4000).nullable().optional(), sbarSituation: z.string().max(4000).nullable().optional(), sbarBackground: z.string().max(4000).nullable().optional(), sbarAssessment: z.string().max(4000).nullable().optional(), sbarRecommendation: z.string().max(4000).nullable().optional() }),
  z.object({ type: z.literal("ssi"), registerId: z.string().min(1).max(191), taskId: z.string().max(191).nullable().optional(), followedUpAt: z.coerce.date(), postoperativeDay: z.number().int().min(0).max(365).nullable().optional(), woundStatus: z.enum(["CLEAN", "REDNESS", "DRAINAGE", "DEHISCENCE", "INFECTION", "OTHER"]), infectionSuspected: z.boolean(), infectionConfirmed: z.boolean().default(false), ssiDepth: z.enum(["SUPERFICIAL", "DEEP", "ORGAN_SPACE"]).nullable().optional(), redness: z.boolean().default(false), warmth: z.boolean().default(false), swelling: z.boolean().default(false), drainage: z.boolean().default(false), woundSeparation: z.boolean().default(false), fever: z.boolean().default(false), increasingPain: z.boolean().default(false), cultureResult: z.string().max(4000).nullable().optional(), treatment: z.string().max(4000).nullable().optional(), outcome: z.string().max(4000).nullable().optional(), nextFollowupAt: z.coerce.date().nullable().optional() }),
]);
const includedRecord = { observations: { orderBy: { recordedAt: "desc" as const }, take: 200 }, complications: { orderBy: { occurredAt: "desc" as const } }, transfers: { orderBy: { transferredAt: "desc" as const } }, ssiFollowups: { orderBy: { followedUpAt: "desc" as const } } };
const registerSelect = { id: true, fiscalYear: true, calendarMonth: true, sequence: true, departmentId: true, operationDate: true, hosxpOperationId: true, diagnosis: true, roomEnteredAt: true, roomExitedAt: true, operationStartedAt: true, operationEndedAt: true, followupTasks: { orderBy: { dueAt: "asc" as const } }, postoperativeRecord: { include: { ...includedRecord } } } as const;

function addDays(date: Date, days: number) { const result = new Date(date); result.setUTCDate(result.getUTCDate() + days); return result; }
function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function toSourceMap(rows: Array<Record<string, unknown>>) { return new Map(rows.map((row) => { try { return [normalizeOperationId(row.operation_id), row] as const; } catch { return ["", row] as const; } })); }
function statusFor(row: { postoperativeRecord: { pacuArrivedAt: Date | null; pacuDischargedAt: Date | null } | null; followupTasks: Array<{ status: string; dueAt: Date }> }, today: Date) {
  if (!row.postoperativeRecord?.pacuArrivedAt) return "NOT_STARTED";
  if (!row.postoperativeRecord.pacuDischargedAt) return "PACU";
  if (row.followupTasks.some((task) => task.status === "PENDING" && task.dueAt <= addDays(today, 30))) return "FOLLOWUP_DUE";
  return "COMPLETE";
}
function sourceFacts(register: { hosxpOperationId: string | null }, source: Map<string, Record<string, unknown>>) {
  if (!register.hosxpOperationId) return null;
  try { return source.get(normalizeOperationId(register.hosxpOperationId)) ?? null; } catch { return null; }
}

export async function GET(request: Request) {
  const user = await getAuthorizedUser("postop:read");
  if (!user) { await recordDenied("POSTOP_READ"); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  const params = new URL(request.url).searchParams;
  const registerId = params.get("registerId");
  const today = new Date();
  if (registerId) {
    const register = await prisma.surgeryRegister.findUnique({ where: { id: registerId }, select: { ...registerSelect, staff: { orderBy: [{ personnelGroup: "asc" }, { positionId: "asc" }], select: { staffName: true, positionName: true, operationItemName: true } } } });
    if (!register) return Response.json({ error: "Not found" }, { status: 404, headers });
    let source: Map<string, Record<string, unknown>> = new Map();
    let sourceAvailable = true;
    if (register.hosxpOperationId) try { source = toSourceMap(await getHosxpOperationsForDateRange(isoDate(addDays(register.operationDate, -1)), isoDate(addDays(register.operationDate, 1)))); } catch { sourceAvailable = false; }
    const hosxp = sourceFacts(register, source);
    const thresholds = await prisma.postoperativeVitalThreshold.findUnique({ where: { id: "global" } });
    await writeAudit(prisma, { actorId: user.id, event: "POSTOP_READ", outcome: "SUCCESS", targetType: "REGISTER", targetId: register.id, metadata: { module: "POSTOP", section: "PACU" } });
    return Response.json({ ...register, state: statusFor(register, today), sourceAvailable, patient: hosxp ? { hn: hosxp.hn ?? null, name: hosxp.ptname ?? null, age: hosxp.age_text ?? null, ward: hosxp.ward_name ?? null, department: hosxp.department_name ?? null, room: hosxp.room_name ?? null, urgency: hosxp.emergency_name ?? null, diagnosis: register.diagnosis ?? null } : null, thresholds }, { headers });
  }

  const fromRaw = params.get("from");
  const toRaw = params.get("to");
  const fromParsed = fromRaw ? z.iso.date().safeParse(fromRaw) : null;
  const toParsed = toRaw ? z.iso.date().safeParse(toRaw) : null;
  if ((fromParsed && !fromParsed.success) || (toParsed && !toParsed.success)) return Response.json({ error: "Invalid date range" }, { status: 400, headers });
  const end = toParsed?.success ? new Date(`${toParsed.data}T00:00:00.000Z`) : new Date(`${isoDate(today)}T00:00:00.000Z`);
  const start = fromParsed?.success ? new Date(`${fromParsed.data}T00:00:00.000Z`) : addDays(end, -90);
  if (end < start || end.getTime() - start.getTime() > 366 * 86400000) return Response.json({ error: "Date range must be within one year" }, { status: 400, headers });
  const page = Math.max(1, Math.min(10000, Number(params.get("page") || 1)));
  const pageSize = pageSizeSchema.safeParse(params.get("pageSize") ?? undefined);
  if (!pageSize.success) return Response.json({ error: "Invalid page size" }, { status: 400, headers });
  const q = (params.get("q") ?? "").trim().toLocaleLowerCase("th");
  const departmentId = params.get("departmentId") ?? "ALL";
  const state = params.get("state") ?? "ALL";
  const [registers, tasks] = await Promise.all([
    prisma.surgeryRegister.findMany({ where: { operationDate: { gte: start, lt: addDays(end, 1) } }, orderBy: [{ operationDate: "desc" }, { hosxpOperationId: "desc" }], take: 2000, select: registerSelect }),
    prisma.postoperativeFollowupTask.findMany({ where: { status: "PENDING", dueAt: { lte: addDays(today, 30) }, register: { operationDate: { gte: addDays(start, -365), lt: addDays(end, 1) } } }, orderBy: [{ dueAt: "asc" }, { id: "asc" }], take: 500, include: { register: { select: { id: true, sequence: true, calendarMonth: true, departmentId: true, operationDate: true, hosxpOperationId: true } } } }),
  ]);
  let sourceRows: Array<Record<string, unknown>> = [];
  let sourceAvailable = true;
  try { sourceRows = await getHosxpOperationsForDateRange(isoDate(addDays(start, -365)), isoDate(addDays(end, 1))); } catch { sourceAvailable = false; }
  const source = toSourceMap(sourceRows);
  const visible = registers.filter((row) => {
    const hosxp = sourceFacts(row, source);
    const currentStatus = statusFor(row, today);
    const searchable = `${row.sequence}/${row.calendarMonth} ${row.departmentId} ${row.hosxpOperationId ?? ""} ${hosxp?.hn ?? ""} ${hosxp?.ptname ?? ""} ${hosxp?.ward_name ?? ""} ${row.diagnosis ?? ""}`.toLocaleLowerCase("th");
    return (!q || searchable.includes(q)) && (departmentId === "ALL" || row.departmentId === departmentId) && (state === "ALL" || currentStatus === state);
  });
  const taskRows = tasks.map((task) => ({ ...task, patient: sourceFacts(task.register, source) ? { hn: sourceFacts(task.register, source)?.hn ?? null, name: sourceFacts(task.register, source)?.ptname ?? null } : null }));
  const selected = visible.slice((page - 1) * pageSize.data, page * pageSize.data).map((row) => {
    const hosxp = sourceFacts(row, source);
    return { ...row, state: statusFor(row, today), patient: hosxp ? { hn: hosxp.hn ?? null, name: hosxp.ptname ?? null, age: hosxp.age_text ?? null, ward: hosxp.ward_name ?? null, department: hosxp.department_name ?? null, room: hosxp.room_name ?? null, urgency: hosxp.emergency_name ?? null, diagnosis: row.diagnosis ?? null } : null };
  });
  const summary = { total: registers.length, notStarted: registers.filter((row) => !row.postoperativeRecord?.pacuArrivedAt).length, inPacu: registers.filter((row) => Boolean(row.postoperativeRecord?.pacuArrivedAt && !row.postoperativeRecord.pacuDischargedAt)).length, dueTasks: tasks.filter((task) => task.dueAt <= today).length, upcomingTasks: tasks.filter((task) => task.dueAt > today).length };
  await writeAudit(prisma, { actorId: user.id, event: "POSTOP_READ", outcome: "SUCCESS", metadata: { module: "POSTOP", total: selected.length } });
  return Response.json({ rows: selected, departments: [...new Set(registers.map((row) => row.departmentId))].sort((a, b) => a.localeCompare(b, "th")), total: visible.length, page, pageSize: pageSize.data, pages: Math.max(1, Math.ceil(visible.length / pageSize.data)), sourceAvailable, tasks: taskRows, summary, from: isoDate(start), to: isoDate(end) }, { headers });
}

export async function POST(request: Request) {
  const user = await getAuthorizedUser("postop:write");
  if (!user || request.headers.get("origin") !== new URL(request.url).origin) { await recordDenied("POSTOP_RECORD_UPDATED", user?.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const parsed = input.safeParse(body);
  if (!parsed.success) return Response.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400, headers });
  const data = parsed.data;
  const result = await prisma.$transaction(async (tx) => {
    const register = await tx.surgeryRegister.findUnique({ where: { id: data.registerId }, select: { id: true } });
    if (!register) return "missing" as const;
    if (data.type === "resolve-complication") {
      const complication = await tx.postoperativeComplication.findFirst({ where: { id: data.complicationId, record: { registerId: data.registerId }, resolvedAt: null }, select: { id: true } });
      if (!complication) return "missing" as const;
    }
    let validatedTaskId: string | null = null;
    if (data.type === "ssi" && data.taskId) {
      const task = await tx.postoperativeFollowupTask.findFirst({ where: { id: data.taskId, registerId: data.registerId, status: "PENDING" }, select: { id: true } });
      if (!task) return "missing" as const;
      validatedTaskId = task.id;
    }
    const record = await tx.postoperativeRecord.upsert({ where: { registerId: data.registerId }, create: { registerId: data.registerId, createdById: user.id }, update: { updatedById: user.id } });
    let event: "POSTOP_RECORD_UPDATED" | "POSTOP_OBSERVATION_RECORDED" | "POSTOP_COMPLICATION_RECORDED" | "POSTOP_TRANSFER_RECORDED" | "POSTOP_SSI_FOLLOWUP_RECORDED" | "POSTOP_FOLLOWUP_TASK_COMPLETED";
    let actionType: "CREATE" | "UPDATE" | "RECORD" | "RESOLVE" = "RECORD";
    if (data.type === "pacu") {
      const { type: _type, registerId: _registerId, ...fields } = data;
      await tx.postoperativeRecord.update({ where: { id: record.id }, data: { ...fields, dischargeAssessedAt: new Date(), dischargeAssessedById: user.id, updatedById: user.id } });
      event = "POSTOP_RECORD_UPDATED"; actionType = "UPDATE";
    } else if (data.type === "observation") { await tx.postoperativeObservation.create({ data: { ...data.observation, recordId: record.id, recordedById: user.id } }); event = "POSTOP_OBSERVATION_RECORDED"; }
    else if (data.type === "complication") { await tx.postoperativeComplication.create({ data: { recordId: record.id, category: data.category, severity: data.severity, occurredAt: data.occurredAt, intervention: data.intervention, outcome: data.outcome, recordedById: user.id } }); event = "POSTOP_COMPLICATION_RECORDED"; }
    else if (data.type === "resolve-complication") {
      const result = await tx.postoperativeComplication.updateMany({ where: { id: data.complicationId, recordId: record.id, resolvedAt: null }, data: { resolvedAt: new Date(), ...(data.outcome ? { outcome: data.outcome } : {}) } });
      if (!result.count) return "missing" as const;
      event = "POSTOP_COMPLICATION_RECORDED"; actionType = "RESOLVE";
    } else if (data.type === "transfer") { await tx.postoperativeTransfer.create({ data: { recordId: record.id, transferredAt: data.transferredAt, fromLocation: data.fromLocation, toLocation: data.toLocation, transportedBy: data.transportedBy, receivedBy: data.receivedBy, handoffNote: data.handoffNote, sbarSituation: data.sbarSituation, sbarBackground: data.sbarBackground, sbarAssessment: data.sbarAssessment, sbarRecommendation: data.sbarRecommendation, recordedById: user.id } }); event = "POSTOP_TRANSFER_RECORDED"; }
    else {
      const { type: _type, registerId: _registerId, taskId: _taskId, ...fields } = data;
      await tx.postoperativeSsiFollowup.create({ data: { ...fields, recordId: record.id, taskId: validatedTaskId, recordedById: user.id } });
      if (validatedTaskId) { await tx.postoperativeFollowupTask.update({ where: { id: validatedTaskId }, data: { status: "COMPLETED", completedAt: new Date(), completedById: user.id } }); event = "POSTOP_FOLLOWUP_TASK_COMPLETED"; }
      else event = "POSTOP_SSI_FOLLOWUP_RECORDED";
    }
    await writeAudit(tx, { actorId: user.id, event, outcome: "SUCCESS", targetType: "REGISTER", targetId: data.registerId, metadata: { module: "POSTOP", section: data.type === "pacu" ? "PACU" : data.type === "observation" ? "OBSERVATION" : data.type === "complication" || data.type === "resolve-complication" ? "COMPLICATION" : data.type === "transfer" ? "TRANSFER" : "SSI", actionType } });
    return record.id;
  });
  if (result === "missing") return Response.json({ error: "ไม่พบทะเบียน/รายการติดตาม หรือรายการถูกบันทึกไปแล้ว" }, { status: 404, headers });
  return Response.json({ ok: true, recordId: result }, { headers });
}
