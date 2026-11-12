import { prisma } from "@/lib/prisma";
import { pruneExpiredAuditLogs } from "./retention";

const CLEANUP_INTERVAL = 10 * 60 * 1000;
const RETRY = 60 * 1000;
const state = globalThis as typeof globalThis & { auditRetentionStarted?: boolean };

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

/** Run at startup and every ten minutes while this Node server is running. */
export function startAuditRetention() {
  if (state.auditRetentionStarted) return;
  state.auditRetentionStarted = true;
  const schedule = (delay: number) => {
    const timer = setTimeout(async () => {
      let next = CLEANUP_INTERVAL;
      try {
        const result = await pruneExpiredAuditLogs(prisma);
        if (result.mayHaveMore) next = RETRY;
      } catch (error) {
        // Do not emit database values or audit contents to application logs.
        console.error("Audit retention cleanup failed; will retry.", {
          errorCode: safeErrorCode(error),
        });
        next = RETRY;
      } finally {
        schedule(next);
      }
    }, delay);
    timer.unref();
  };
  schedule(0);
}
