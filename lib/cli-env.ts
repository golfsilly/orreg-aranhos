import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import { passwordSchema } from "./password-policy.ts";

// Prisma generation is allowed without a database; database commands and
// bootstrap still require their respective values at the point of use.
export const cliEnv = createEnv({
  server: {
    DATABASE_URL: z.url().refine((value) => value.startsWith("mysql://")).optional(),
    BOOTSTRAP_EMAIL: z.email().max(191).optional(),
    BOOTSTRAP_NAME: z.string().trim().min(1).max(191).optional(),
    BOOTSTRAP_PASSWORD: passwordSchema.optional(),
  },
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
});
