import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    createEnv({
      server: { NEXT_RUNTIME: z.literal("nodejs") },
      runtimeEnv: { NEXT_RUNTIME: process.env.NEXT_RUNTIME },
    });
    const { startAuditRetention } =
      await import("./lib/audit/retention-scheduler");
    startAuditRetention();
    const { startSetOrNotificationScheduler } =
      await import("./lib/notifications/set-or-scheduler");
    startSetOrNotificationScheduler();
  }
}
