import { z } from "zod";
import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { writeAudit } from "@/lib/audit/write";
import { prisma } from "@/lib/prisma";

const headers = { "Cache-Control": "private, no-store" };
const day = z.iso.date();
const addDays = (date: Date, count: number) => { const result = new Date(date); result.setUTCDate(result.getUTCDate() + count); return result; };
const dateKey = (date: Date) => date.toISOString().slice(0, 10);

export async function GET(request: Request) {
  const user = await getAuthorizedUser("postop:read");
  if (!user) { await recordDenied("POSTOP_READ"); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  const params = new URL(request.url).searchParams;
  const period = z.enum(["DAY", "MONTH", "YEAR"]).safeParse(params.get("period") ?? "MONTH");
  const from = day.safeParse(params.get("from") ?? dateKey(addDays(new Date(), -90)));
  const to = day.safeParse(params.get("to") ?? dateKey(new Date()));
  if (!period.success || !from.success || !to.success) return Response.json({ error: "Invalid report period" }, { status: 400, headers });
  const start = new Date(`${from.data}T00:00:00.000Z`);
  const end = addDays(new Date(`${to.data}T00:00:00.000Z`), 1);
  if (end < start || end.getTime() - start.getTime() > 366 * 86400000) return Response.json({ error: "Report range must be within one year" }, { status: 400, headers });
  const records = await prisma.surgeryRegister.findMany({ where: { operationDate: { gte: start, lt: end } }, take: 5000, select: { id: true, operationDate: true, postoperativeRecord: { select: { pacuArrivedAt: true, pacuDischargedAt: true, airwayStable: true, vitalSignsStable: true, painControlled: true, nauseaControlled: true, consciousnessRecovered: true, handoffComplete: true, complications: { select: { category: true, severity: true, resolvedAt: true } }, transfers: { select: { toLocation: true } }, ssiFollowups: { select: { infectionSuspected: true, infectionConfirmed: true } } } }, followupTasks: { select: { status: true, dueAt: true } } } });
  const cases = records.flatMap((item) => item.postoperativeRecord ? [{ ...item, record: item.postoperativeRecord }] : []);
  const durations = cases.flatMap(({ record }) => record.pacuArrivedAt && record.pacuDischargedAt ? [Math.max(0, (record.pacuDischargedAt.getTime() - record.pacuArrivedAt.getTime()) / 60000)] : []);
  const checklistComplete = cases.filter(({ record }) => [record.airwayStable, record.vitalSignsStable, record.painControlled, record.nauseaControlled, record.consciousnessRecovered, record.handoffComplete].every((value) => value === true)).length;
  const suspected = cases.reduce((sum, item) => sum + item.record.ssiFollowups.filter((entry) => entry.infectionSuspected).length, 0);
  const confirmed = cases.reduce((sum, item) => sum + item.record.ssiFollowups.filter((entry) => entry.infectionConfirmed).length, 0);
  const complications: Record<string, number> = {};
  const transfers: Record<string, number> = {};
  for (const item of cases) {
    for (const complication of item.record.complications) complications[complication.category] = (complications[complication.category] ?? 0) + 1;
    for (const transfer of item.record.transfers) transfers[transfer.toLocation] = (transfers[transfer.toLocation] ?? 0) + 1;
  }
  const overdue = records.reduce((sum, item) => sum + item.followupTasks.filter((task) => task.status === "PENDING" && task.dueAt < new Date()).length, 0);
  const buckets = new Map<string, { cases: number; pacuMinutesTotal: number; pacuSamples: number; complications: number; suspectedSsi: number; confirmedSsi: number }>();
  for (const item of cases) {
    const key = period.data === "DAY" ? dateKey(item.operationDate) : period.data === "MONTH" ? dateKey(item.operationDate).slice(0, 7) : dateKey(item.operationDate).slice(0, 4);
    const bucket = buckets.get(key) ?? { cases: 0, pacuMinutesTotal: 0, pacuSamples: 0, complications: 0, suspectedSsi: 0, confirmedSsi: 0 };
    bucket.cases += 1;
    if (item.record.pacuArrivedAt && item.record.pacuDischargedAt) { bucket.pacuMinutesTotal += Math.max(0, (item.record.pacuDischargedAt.getTime() - item.record.pacuArrivedAt.getTime()) / 60000); bucket.pacuSamples += 1; }
    bucket.complications += item.record.complications.length;
    bucket.suspectedSsi += item.record.ssiFollowups.filter((entry) => entry.infectionSuspected).length;
    bucket.confirmedSsi += item.record.ssiFollowups.filter((entry) => entry.infectionConfirmed).length;
    buckets.set(key, bucket);
  }
  const dueSoon = await prisma.postoperativeFollowupTask.count({ where: { status: "PENDING", dueAt: { gte: new Date(), lte: addDays(new Date(), 30) } } });
  await writeAudit(prisma, { actorId: user.id, event: "POSTOP_READ", outcome: "SUCCESS", metadata: { module: "POSTOP", reportPeriod: period.data, total: records.length } });
  return Response.json({ from: from.data, to: to.data, period: period.data, summary: { surgeries: records.length, casesStarted: cases.length, pacuDischarged: durations.length, averagePacuMinutes: durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null, dischargeChecklistComplete: checklistComplete, complicationCount: Object.values(complications).reduce((sum, value) => sum + value, 0), suspectedSsi: suspected, confirmedSsi: confirmed, overdueTasks: overdue, dueSoonTasks: dueSoon }, complications: Object.entries(complications).map(([category, count]) => ({ category, count })), transfers: Object.entries(transfers).map(([destination, count]) => ({ destination, count })), trend: [...buckets].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({ date, ...values, averagePacuMinutes: values.pacuSamples ? values.pacuMinutesTotal / values.pacuSamples : null })) }, { headers });
}
