import { writeAudit } from "@/lib/audit/write";
import { env } from "@/lib/env";
import {
  getHosxpMaxOperationId,
  getHosxpNewOperationRequests,
  getHosxpOperationRequestsAfterId,
} from "@/lib/hosxp/operations";
import { prisma } from "@/lib/prisma";
import "server-only";
import { sendSetOrMessages } from "./set-or-message";

const JOB = "SET_OR_NEW_OPERATION";
const INTERVAL_MS = 5 * 60_000;

type SchedulerState = { timer?: NodeJS.Timeout; running?: boolean };
const globalScheduler = globalThis as typeof globalThis & {
  setOrNotificationScheduler?: SchedulerState;
};

function sqlDateTime(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace("T", " ");
}

function cursorDateTime(row: Record<string, unknown>) {
  const value = row.request_timestamp;
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
  )
    return value;
  return "";
}

async function auditRead(total: number, outcome: "SUCCESS" | "FAILURE") {
  await writeAudit(prisma, {
    event: "HOSXP_SET_OR_NOTIFICATION_READ",
    outcome,
    metadata: { total, section: "NOTIFICATION" },
  });
}

async function runCheck() {
  if (!env.MOPH_NOTIFY_GROUP_CLIENT_KEY || !env.MOPH_NOTIFY_GROUP_SECRET_KEY)
    return;

  const cursor = await prisma.surgeryNotificationCursor.findUnique({
    where: { job: JOB },
  });
  if (!cursor) {
    // Avoid blasting historical operations when notifications are enabled for
    // the first time. The scheduler starts watching after the current maximum.
    await prisma.surgeryNotificationCursor.create({
      data: {
        job: JOB,
        requestAt: sqlDateTime(new Date()),
        operationId: await getHosxpMaxOperationId(),
      },
    });
    return;
  }

  const throughAt = sqlDateTime(new Date());
  let rows: Record<string, unknown>[];
  try {
    if (cursor.operationId === "0") {
      // Recover the short interval that the earlier timestamp cursor could
      // skip when HOSxP committed a row after its request timestamp.
      const lastSuccess = await prisma.auditLog.findFirst({
        where: { event: "HOSXP_SET_OR_NOTIFICATION_SENT", outcome: "SUCCESS" },
        orderBy: { occurredAt: "desc" },
        select: { occurredAt: true },
      });
      if (!lastSuccess) {
        await prisma.surgeryNotificationCursor.update({
          where: { job: JOB },
          data: {
            requestAt: throughAt,
            operationId: await getHosxpMaxOperationId(),
          },
        });
        return;
      }
      const since = sqlDateTime(lastSuccess.occurredAt);
      rows = await getHosxpNewOperationRequests(since, "0", throughAt);
      if (!rows.length) {
        await prisma.surgeryNotificationCursor.update({
          where: { job: JOB },
          data: {
            requestAt: throughAt,
            operationId: await getHosxpMaxOperationId(),
          },
        });
        return;
      }
    } else {
      rows = await getHosxpOperationRequestsAfterId(cursor.operationId);
    }
  } catch {
    await auditRead(0, "FAILURE").catch(() => undefined);
    return;
  }

  if (!rows.length) return;

  try {
    await sendSetOrMessages(rows);
  } catch {
    await prisma
      .$transaction(async (tx) => {
        await writeAudit(tx, {
          event: "HOSXP_SET_OR_NOTIFICATION_READ",
          outcome: "SUCCESS",
          metadata: { total: rows.length, section: "NOTIFICATION" },
        });
        await writeAudit(tx, {
          event: "HOSXP_SET_OR_NOTIFICATION_SENT",
          outcome: "FAILURE",
          metadata: { total: rows.length, section: "NOTIFICATION" },
        });
      })
      .catch(() => undefined);
    return;
  }

  const maxOperationId = rows.reduce(
    (max, row) => {
      const id = String(row.operation_id ?? "0");
      return BigInt(id) > BigInt(max) ? id : max;
    },
    cursor.operationId === "0" ? "0" : cursor.operationId,
  );
  const lastTimestamp = rows.map(cursorDateTime).filter(Boolean).sort().at(-1);

  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, {
      event: "HOSXP_SET_OR_NOTIFICATION_READ",
      outcome: "SUCCESS",
      metadata: { total: rows.length, section: "NOTIFICATION" },
    });
    await writeAudit(tx, {
      event: "HOSXP_SET_OR_NOTIFICATION_SENT",
      outcome: "SUCCESS",
      metadata: { total: rows.length, section: "NOTIFICATION" },
    });
    await tx.surgeryNotificationCursor.update({
      where: { job: JOB },
      data: {
        requestAt: lastTimestamp ?? cursor.requestAt,
        operationId: maxOperationId,
      },
    });
  });
}

export function startSetOrNotificationScheduler() {
  if (!env.MOPH_NOTIFY_GROUP_CLIENT_KEY || !env.MOPH_NOTIFY_GROUP_SECRET_KEY)
    return;
  const state = (globalScheduler.setOrNotificationScheduler ??= {});
  if (state.timer) return;

  const tick = async () => {
    if (state.running) return;
    state.running = true;
    try {
      await runCheck();
    } catch {
      // Keep the background worker quiet; operational errors contain no patient data.
    } finally {
      state.running = false;
    }
  };

  void tick();
  state.timer = setInterval(() => void tick(), INTERVAL_MS);
  state.timer.unref?.();
}
