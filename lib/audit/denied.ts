import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit, type AuditEvent } from "./write";

// Never record unvalidated request content as a denied target.
export async function recordDenied(event: AuditEvent, knownActorId?: string) {
  const session = knownActorId ? null : await auth.api.getSession({ headers: await headers() });
  await writeAudit(prisma, { actorId: knownActorId ?? session?.user.id, event, outcome: "DENIED" });
}
