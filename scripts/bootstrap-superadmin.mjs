import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.ts";
import { cliEnv } from "../lib/cli-env.ts";
import { writeAudit } from "../lib/audit/write.ts";
import { passwordSchema } from "../lib/password-policy.ts";

// Local administrative bootstrap only. Credentials are supplied by environment,
// never command arguments. It does not run during install, migration, or startup.
const databaseUrl = cliEnv.DATABASE_URL;
const email = cliEnv.BOOTSTRAP_EMAIL?.trim().toLowerCase();
const name = cliEnv.BOOTSTRAP_NAME;
const password = cliEnv.BOOTSTRAP_PASSWORD;
if (!databaseUrl || !email || !name || !passwordSchema.safeParse(password).success || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191 || name.length > 191) {
  throw new Error("Set DATABASE_URL, BOOTSTRAP_EMAIL, BOOTSTRAP_NAME and a 6–128 character BOOTSTRAP_PASSWORD.");
}
const url = new URL(databaseUrl);
if (url.protocol !== "mysql:") throw new Error("DATABASE_URL must use mysql://");
const adapter = new PrismaMariaDb({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: decodeURIComponent(url.pathname.slice(1)), connectionLimit: 1 });
const prisma = new PrismaClient({ adapter });
try {
  const hashed = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    if (await tx.user.count() !== 0) throw new Error("Bootstrap requires an empty user table.");
    const id = "initial-superadmin";
    await tx.user.create({ data: { id, name, email, role: "SUPERADMIN", accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: hashed } } } });
    await writeAudit(tx, { actorId: id, event: "USER_BOOTSTRAPPED", outcome: "SUCCESS", targetType: "USER", targetId: id, metadata: { role: "SUPERADMIN", active: true } });
  });
  console.log("Initial superadmin created.");
} finally { await prisma.$disconnect(); }
