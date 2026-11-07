import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export async function register() {
  // Next.js statically replaces this framework-defined variable, excluding
  // Node-only dependencies from the Edge instrumentation bundle.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    createEnv({
      server: { NEXT_RUNTIME: z.literal("nodejs") },
      runtimeEnv: { NEXT_RUNTIME: process.env.NEXT_RUNTIME },
    });
    const { startAuditRetention } =
      await import("./lib/audit/retention-scheduler");
    startAuditRetention();
  }
}
