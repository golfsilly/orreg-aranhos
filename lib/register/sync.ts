import "server-only";
import { randomUUID } from "node:crypto";
import { getHosxpOperationsForDay } from "@/lib/hosxp/operations";
import { normalizeOperationId } from "@/lib/hosxp/operation-id";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fiscalPeriod } from "./fiscal-period";
import { urgencyFromHosxp, type Urgency } from "./details";

class SyncConflict extends Error {}

/** The caller must verify register:write and pass the authenticated user ID. */
export async function syncHosxpDay(day: string, userId: string) {
  const period = fiscalPeriod(day);
  const operationDate = new Date(`${day}T00:00:00.000Z`);

  async function attempt() {
    // Re-read the source on retry, in case HOSxP changed while another sync ran.
    const rows = await getHosxpOperationsForDay(day);
    const ids = [...new Set(rows.map((row) => normalizeOperationId(row.operation_id)))];
    const sourceUrgency = new Map<string, Urgency | null>();
    for (const row of rows) {
      const id = normalizeOperationId(row.operation_id);
      if (!sourceUrgency.has(id)) sourceUrgency.set(id, urgencyFromHosxp(row.emergency_name));
    }
    if (!ids.length) return { total: 0, created: 0, renumbered: 0, dateUpdated: 0, existing: 0 };

    return prisma.$transaction(async (tx) => {
      // Recheck the actor under a lock so concurrent account changes cannot
      // revoke write access while this transaction is committing.
      await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
      const actor = await tx.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
      if (!actor?.isActive || !hasPermission(actor.role, "register:write")) throw new Error("Forbidden");

      // Lock the destination counter until all allocations and audit records
      // commit. Old counters are never decremented or reused.
      await tx.$executeRaw`
        INSERT INTO SurgeryRegisterCounter (fiscalYear, calendarMonth, lastSequence)
        VALUES (${period.fiscalYear}, ${period.calendarMonth}, 0)
        ON DUPLICATE KEY UPDATE lastSequence = lastSequence
      `;
      const counter = await tx.surgeryRegisterCounter.findUniqueOrThrow({ where: { fiscalYear_calendarMonth: period } });
      const existing = await tx.surgeryRegister.findMany({
        where: { hosxpOperationId: { in: ids } },
        select: { id: true, hosxpOperationId: true, fiscalYear: true, calendarMonth: true, sequence: true, operationDate: true, revision: true },
      });
      const byId = new Map(existing.map((entry) => [entry.hosxpOperationId, entry]));
      let next = counter.lastSequence;
      let created = 0, renumbered = 0, dateUpdated = 0, unchanged = 0;

      for (const id of ids) {
        const previous = byId.get(id);
        if (!previous) {
          await tx.surgeryRegister.create({ data: {
            id: randomUUID(), ...period, sequence: ++next, operationDate,
            hosxpOperationId: id, createdById: userId, urgency: sourceUrgency.get(id) ?? null,
          } });
          created += 1;
          continue;
        }
        const previousDay = previous.operationDate.toISOString().slice(0, 10);
        if (previousDay === day && previous.fiscalYear === period.fiscalYear && previous.calendarMonth === period.calendarMonth) {
          unchanged += 1;
          continue;
        }
        const movesMonth = previous.fiscalYear !== period.fiscalYear || previous.calendarMonth !== period.calendarMonth;
        const sequence = movesMonth ? ++next : previous.sequence;
        const changed = await tx.surgeryRegister.updateMany({
          where: { id: previous.id, revision: previous.revision },
          data: { ...period, sequence, operationDate, revision: { increment: 1 } },
        });
        if (!changed.count) throw new SyncConflict("Register changed during sync");
        await tx.surgeryRegisterNumberChange.create({ data: {
          registerId: previous.id, changedById: userId,
          before: { fiscalYear: previous.fiscalYear, calendarMonth: previous.calendarMonth, sequence: previous.sequence, operationDate: previousDay, revision: previous.revision },
          after: { ...period, sequence, operationDate: day, revision: previous.revision + 1 },
        } });
        if (movesMonth) renumbered += 1;
        else dateUpdated += 1;
      }
      if (next !== counter.lastSequence) {
        await tx.surgeryRegisterCounter.update({ where: { fiscalYear_calendarMonth: period }, data: { lastSequence: next } });
      }
      return { total: ids.length, created, renumbered, dateUpdated, existing: unchanged };
    }, { maxWait: 10000, timeout: 30000 });
  }

  try { return await attempt(); }
  catch (error) {
    // Retry a rolled-back optimistic conflict, unique conflict, or deadlock once.
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (error instanceof SyncConflict || code === "P2002" || code === "P2034") return attempt();
    throw error;
  }
}
