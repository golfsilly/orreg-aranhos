import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { writeAudit } from "@/lib/audit/write";
import { prisma } from "@/lib/prisma";

const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const user = await getAuthorizedUser("postop:write");
  if (!user || request.headers.get("origin") !== new URL(request.url).origin) { await recordDenied("POSTOP_FOLLOWUP_TASKS_GENERATED", user?.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  const cases = await prisma.surgeryRegister.findMany({ where: { postoperativeRecord: { isNot: null } }, orderBy: { operationDate: "asc" }, take: 5000, select: { id: true, operationDate: true, hosxpOperationId: true, implantsUsed: { select: { id: true } }, followupTasks: { take: 1, select: { id: true } } } });
  const candidates = cases.filter((item) => item.followupTasks.length === 0);
  const templates = await prisma.postoperativeSsiTemplate.findMany({ where: { isActive: true, scopeType: { in: ["DEFAULT", "IMPLANT"] } }, include: { rounds: { where: { isActive: true }, orderBy: { dayOffset: "asc" } } } });
  if (candidates.length === 0 || templates.length === 0) return Response.json({ created: 0, eligible: candidates.length }, { headers });
  const defaultTemplate = templates.find((item) => item.scopeType === "DEFAULT" && item.scopeKey === "ALL");
  const implantTemplate = templates.find((item) => item.scopeType === "IMPLANT" && item.scopeKey === "ALL");
  const rowsToCreate = candidates.flatMap((item) => {
    const selected = item.implantsUsed.length ? implantTemplate ?? defaultTemplate : defaultTemplate;
    if (!selected) return [];
    return selected.rounds.map((round) => ({ registerId: item.id, templateId: selected.id, templateRoundId: round.id, templateNameSnapshot: selected.name, roundLabel: round.label, roundNumber: round.roundNumber, dayOffset: round.dayOffset, dueAt: new Date(item.operationDate.getTime() + round.dayOffset * 86400000) }));
  });
  const created = await prisma.$transaction(async (tx) => {
    const result = rowsToCreate.length ? await tx.postoperativeFollowupTask.createMany({ data: rowsToCreate, skipDuplicates: true }) : { count: 0 };
    await writeAudit(tx, { actorId: user.id, event: "POSTOP_READ", outcome: "SUCCESS", metadata: { module: "POSTOP", section: "SSI" } });
    await writeAudit(tx, { actorId: user.id, event: "POSTOP_FOLLOWUP_TASKS_GENERATED", outcome: "SUCCESS", metadata: { module: "POSTOP", section: "SSI", tasksGenerated: result.count, total: candidates.length } });
    return result.count;
  });
  return Response.json({ created, eligible: candidates.length }, { headers });
}
