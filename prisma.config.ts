import "dotenv/config";
import { defineConfig } from "prisma/config";
import { cliEnv } from "./lib/cli-env";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: cliEnv.DATABASE_URL },
});
