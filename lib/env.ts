import "server-only";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// All application environment access goes through this server-only schema.
// Optional integrations remain optional until their feature is used.
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.url().refine((value) => value.startsWith("mysql://"), "DATABASE_URL must use mysql://"),
    BETTER_AUTH_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    HOSXP_HOST: z.string().min(1).optional(),
    HOSXP_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
    HOSXP_DATABASE: z.string().min(1).optional(),
    HOSXP_USER: z.string().min(1).optional(),
    HOSXP_PASSWORD: z.string().min(1).optional(),
    HOSXP_TLS_CA_PATH: z.string().min(1).optional(),
    HOSXP_ALLOW_INSECURE: z.enum(["true", "false"]).default("false"),
    MOPH_HEALTH_ID_BASE_URL: z.url().optional(),
    MOPH_HEALTH_ID_CLIENT_ID: z.string().min(1).optional(),
    MOPH_HEALTH_ID_CLIENT_SECRET: z.string().min(1).optional(),
    MOPH_PROVIDER_ID_BASE_URL: z.url().optional(),
    MOPH_PROVIDER_ID_CLIENT_ID: z.string().min(1).optional(),
    MOPH_PROVIDER_ID_CLIENT_SECRET: z.string().min(1).optional(),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    SMTP_FROM: z.string().min(1).optional(),
  },
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
});
