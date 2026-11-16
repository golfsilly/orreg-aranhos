import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getHosxpNotificationPatients } from "@/lib/hosxp/operations";
import { writeAudit } from "@/lib/audit/write";
import { monitorHealth, monitorWindow, safeMonitorError, type MonitorQuery, type MonitorResponse } from "./monitor-contract";

const job = "SET_OR_NEW_OPERATION";

export async function loadNotificationMonitor(query: MonitorQuery, actorId: string, now = new Date()): Promise<MonitorResponse> {
  const window = monitorWindow(query.days, now);
  const recent: Prisma.SurgeryNotificationDeliveryWhereInput = { job, OR: [
    { sentAt: window }, { sentAt: null, createdAt: window },
  ] };
  const where: Prisma.SurgeryNotificationDeliveryWhereInput = {
    ...recent, ...(query.status === "ALL" ? {} : { status: query.status }),
    ...(query.q ? { operationId: { contains: query.q } } : {}),
  };
  const pageSize = Number(query.pageSize);
  const [cursor, counts, total, rows, lastSent] = await prisma.$transaction((tx) => Promise.all([
    tx.surgeryNotificationCursor.findUnique({ where: { job } }),
    tx.surgeryNotificationDelivery.groupBy({ by: ["status"], where: recent, _count: { _all: true } }),
    tx.surgeryNotificationDelivery.count({ where }),
    tx.surgeryNotificationDelivery.findMany({ where, orderBy: [{ createdAt: "desc" }, { operationId: "desc" }], skip: (query.page - 1) * pageSize, take: pageSize }),
    tx.surgeryNotificationDelivery.findFirst({ where: { ...recent, status: "SENT" }, orderBy: { sentAt: "desc" }, select: { sentAt: true } }),
  ]));
  // Log the clinical lookup before reading identities; no patient fields enter audit metadata.
  await writeAudit(prisma, { actorId, event: "NOTIFICATIONS_MONITOR_READ", outcome: "SUCCESS", metadata: { total: rows.length, section: "NOTIFICATION" } });
  let sourceAvailable = true;
  let patients: Awaited<ReturnType<typeof getHosxpNotificationPatients>> = new Map();
  try { patients = await getHosxpNotificationPatients(rows.map((row) => row.operationId)); }
  catch { sourceAvailable = false; }
  const enabled = env.MOPH_NOTIFY_SCHEDULER_ENABLED ?? env.NODE_ENV === "production";
  const configured = Boolean(env.MOPH_NOTIFY_GROUP_CLIENT_KEY && env.MOPH_NOTIFY_GROUP_SECRET_KEY);
  const count = (status: string) => counts.find((row) => row.status === status)?._count._all ?? 0;
  return {
    generatedAt: now.toISOString(), windowStart: window.gte.toISOString(), windowEnd: window.lte.toISOString(),
    enabled, configured, logoConfigured: Boolean(env.MOPH_NOTIFY_ORREG_LOGO_URL),
    health: monitorHealth({ enabled, configured, cursor, now }),
    cursor: cursor ? { operationId: cursor.operationId, paused: cursor.paused, lastErrorCode: safeMonitorError(cursor.lastErrorCode), lastCheckedAt: cursor.lastCheckedAt?.toISOString() ?? null, lastCheckErrorCode: safeMonitorError(cursor.lastCheckErrorCode) } : null,
    lastSentAt: lastSent?.sentAt?.toISOString() ?? null,
    counts: { total: counts.reduce((sum, row) => sum + row._count._all, 0), sent: count("SENT"), review: count("REVIEW"), claimed: count("CLAIMED") },
    total, page: query.page, pageSize, sourceAvailable,
    rows: rows.map((row) => ({
      operationId: row.operationId,
      status: row.status === "SENT" || row.status === "REVIEW" || row.status === "CLAIMED" ? row.status : "UNKNOWN",
      createdAt: row.createdAt.toISOString(), sentAt: row.sentAt?.toISOString() ?? null,
      errorCode: safeMonitorError(row.errorCode), patient: patients.get(row.operationId) ?? null,
    })),
  };
}
