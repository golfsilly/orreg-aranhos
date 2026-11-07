import { prisma } from "@/lib/prisma";
import { pruneExpiredAuditLogs } from "./retention";

const CLEANUP_INTERVAL = 10 * 60 * 1000;
const RETRY = 60 * 1000;
const state = globalThis as typeof globalThis & { auditRetentionStarted?: boolean };

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
      } catch {
        // Do not emit database values or audit contents to application logs.
        console.error("Audit retention cleanup failed; will retry.");
        next = RETRY;
      } finally {
        schedule(next);
      }
    }, delay);
    timer.unref();
  };
  schedule(0);
}
