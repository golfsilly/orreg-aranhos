import { writeAudit } from "@/lib/audit/write";
import { env } from "@/lib/env";
import {
  getHosxpMaxOperationId,
  getHosxpNewOperationRequests,
  getHosxpOperationRequestsAfterId,
} from "@/lib/hosxp/operations";
import { prisma } from "@/lib/prisma";
import "server-only";
import { sendSetOrMessages, SetOrNotificationError, type SetOrNotificationErrorCode } from "./set-or-message";

const JOB = "SET_OR_NEW_OPERATION";
const INTERVAL_MS = 5 * 60_000;

type SchedulerState = { timer?: NodeJS.Timeout; running?: boolean };
const globalScheduler = globalThis as typeof globalThis & {
  setOrNotificationScheduler?: SchedulerState;
};

function safeErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return "UNKNOWN";
  const value = error as { code?: unknown; name?: unknown };
  if (typeof value.code === "string" && /^P\d{4}$/.test(value.code))
    return value.code;
  if (typeof value.code === "string" && /^ER_[A-Z0-9_]+$/.test(value.code))
    return value.code;
  if (value.name === "PrismaClientValidationError") return "PRISMA_VALIDATION";
  if (value.name === "DriverAdapterError") return "DATABASE_DRIVER";
  return "UNKNOWN";
}

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

export async function runSetOrNotificationCheck() {
  if (!(env.MOPH_NOTIFY_SCHEDULER_ENABLED ?? (env.NODE_ENV === "production"))) return;
  if (!env.MOPH_NOTIFY_GROUP_CLIENT_KEY || !env.MOPH_NOTIFY_GROUP_SECRET_KEY)
    return;

  const cursor = await prisma.surgeryNotificationCursor.findUnique({
    where: { job: JOB },
  });
  if (!cursor) {
    // Avoid blasting historical operations when notifications are enabled for
    // the first time. The scheduler starts watching after the current maximum.
    await prisma.surgeryNotificationCursor.upsert({
      where: { job: JOB },
      update: {},
      create: {
        job: JOB,
        requestAt: sqlDateTime(new Date()),
        operationId: await getHosxpMaxOperationId(),
      },
    });
    return;
  }
  if (cursor.paused) return;

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

  // Joins must never create a second message for the same HOSxP operation.
  rows = [...new Map(rows.map((row) => {
    const id = String(row.operation_id ?? "");
    if (!/^[1-9]\d*$/.test(id)) throw new Error("Invalid notification operation key");
    return [id, row] as const;
  })).values()].sort((a, b) => BigInt(String(a.operation_id)) < BigInt(String(b.operation_id)) ? -1 : 1);
  if (!rows.length) return;
  await auditRead(rows.length, "SUCCESS");

  // A committed database claim protects separate Node processes as well as restarts.
  // No automatic expiry: a crash after delivery must not permit another send.
  const claimed = await prisma.$transaction(async (tx) => {
    const result = await tx.surgeryNotificationCursor.updateMany({
      where: { job: JOB, paused: false, operationId: cursor.operationId },
      data: { paused: true, lastErrorCode: "SEND_IN_PROGRESS" },
    });
    if (result.count) await writeAudit(tx, {
      event: "HOSXP_SET_OR_NOTIFICATION_CLAIMED", outcome: "SUCCESS",
      metadata: { total: rows.length, section: "NOTIFICATION" },
    });
    return result.count === 1;
  });
  if (!claimed) return;

  for (const row of rows) {
    const operationId = String(row.operation_id);
    const key = { job_operationId: { job: JOB, operationId } };
    const delivery = await prisma.surgeryNotificationDelivery.findUnique({ where: key });
    if (delivery && delivery.status !== "SENT") {
      // CLAIMED/REVIEW could already have reached MOPH; never retry blindly.
      await prisma.$transaction(async (tx) => {
        await tx.surgeryNotificationCursor.update({ where: { job: JOB }, data: { lastErrorCode: "DELIVERY_REVIEW_REQUIRED" } });
        await writeAudit(tx, { event: "HOSXP_SET_OR_NOTIFICATION_CHECKPOINT", outcome: "FAILURE", metadata: { section: "NOTIFICATION", total: 1 } });
      });
      return;
    }
    if (!delivery) await prisma.$transaction(async (tx) => {
      await tx.surgeryNotificationDelivery.create({ data: { job: JOB, operationId, status: "CLAIMED" } });
      await writeAudit(tx, { event: "HOSXP_SET_OR_NOTIFICATION_CLAIMED", outcome: "SUCCESS", targetType: "HOSXP_OPERATION", targetId: operationId, metadata: { section: "NOTIFICATION", total: 1 } });
    });

    try {
      // One operation per request also avoids replaying a whole batch after a partial failure.
      if (!delivery) await sendSetOrMessages([row]);
      await prisma.$transaction(async (tx) => {
        if (!delivery) await tx.surgeryNotificationDelivery.update({ where: key, data: { status: "SENT", sentAt: new Date(), errorCode: null } });
        await tx.surgeryNotificationCursor.update({ where: { job: JOB }, data: { operationId, requestAt: cursorDateTime(row) || cursor.requestAt } });
        await writeAudit(tx, {
          event: delivery ? "HOSXP_SET_OR_NOTIFICATION_CHECKPOINT" : "HOSXP_SET_OR_NOTIFICATION_SENT",
          outcome: "SUCCESS", targetType: "HOSXP_OPERATION", targetId: operationId,
          metadata: { total: 1, section: "NOTIFICATION" },
        });
      });
    } catch (error) {
    const errorCode: SetOrNotificationErrorCode = error instanceof SetOrNotificationError
      ? error.code
      : "UNEXPECTED_SEND_ERROR";
    console.error("[set-or-notification] MOPH send failed; cursor paused for review", {
      errorCode,
      httpStatus: error instanceof SetOrNotificationError ? error.httpStatus : undefined,
      responseCode: error instanceof SetOrNotificationError ? error.responseCode : undefined,
      total: 1,
    });
    await prisma
      .$transaction(async (tx) => {
        await tx.surgeryNotificationDelivery.update({ where: key, data: { status: "REVIEW", errorCode } });
        await tx.surgeryNotificationCursor.update({
          where: { job: JOB },
          data: { paused: true, lastErrorCode: errorCode },
        });
        await writeAudit(tx, {
          event: "HOSXP_SET_OR_NOTIFICATION_READ",
          outcome: "SUCCESS",
          metadata: { total: 1, section: "NOTIFICATION" },
        });
        await writeAudit(tx, {
          event: "HOSXP_SET_OR_NOTIFICATION_SENT",
          outcome: "FAILURE",
          metadata: {
            total: 1,
            section: "NOTIFICATION",
            notificationError: errorCode,
            ...(error instanceof SetOrNotificationError && error.responseCode
              ? { notificationResponseCode: error.responseCode }
              : {}),
            ...(error instanceof SetOrNotificationError && error.httpStatus
              ? { httpStatus: error.httpStatus }
              : {}),
          },
        });
      })
      .catch((persistError) => {
        console.error("[set-or-notification] Could not persist notification pause", {
          stage: "PERSIST_FAILURE_STATE",
          errorCode,
          databaseErrorCode: safeErrorCode(persistError),
        });
      });
    return;
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.surgeryNotificationCursor.update({
      where: { job: JOB },
      data: { paused: false, lastErrorCode: null },
    });
    await writeAudit(tx, { event: "HOSXP_SET_OR_NOTIFICATION_CHECKPOINT", outcome: "SUCCESS", metadata: { total: rows.length, section: "NOTIFICATION" } });
  });
}

export function startSetOrNotificationScheduler() {
  if (!(env.MOPH_NOTIFY_SCHEDULER_ENABLED ?? (env.NODE_ENV === "production"))) {
    console.info("[set-or-notification] Scheduler disabled; development does not send automatically");
    return;
  }
  if (!env.MOPH_NOTIFY_GROUP_CLIENT_KEY || !env.MOPH_NOTIFY_GROUP_SECRET_KEY)
    return;
  const state = (globalScheduler.setOrNotificationScheduler ??= {});
  if (state.timer) return;

  const tick = async () => {
    if (state.running) return;
    state.running = true;
    try {
      await runSetOrNotificationCheck();
    } catch (error) {
      console.error("[set-or-notification] Scheduler check failed", {
        stage: "RUN_CHECK",
        errorCode: safeErrorCode(error),
      });
    } finally {
      state.running = false;
    }
  };

  void tick();
  state.timer = setInterval(() => void tick(), INTERVAL_MS);
  state.timer.unref?.();
}
