import "server-only";
import { randomUUID } from "node:crypto";
import { getHosxpOperationTeams, getHosxpOperationsForDay } from "@/lib/hosxp/operations";
import { normalizeOperationId } from "@/lib/hosxp/operation-id";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fiscalPeriod } from "./fiscal-period";
import { urgencyFromHosxp, type Urgency } from "./details";
import { writeAudit } from "@/lib/audit/write";

class SyncConflict extends Error {}

type StaffSnapshot = { positionId: number; positionName: string; personnelGroup: number; staffName: string; hosxpStaffCode: string | null; operationItemName: string | null; enteredDate: string | null; enteredTime: string | null; exitedDate: string | null; exitedTime: string | null };

function staffSnapshots(rows: Record<string, unknown>[]) {
  const byOperationId = new Map<string, StaffSnapshot[]>();
  for (const row of rows) {
    const operationId = normalizeOperationId(row.operation_id);
    const positionId = Number(row.position_id);
    const code = row.doctor == null ? null : String(row.doctor).trim() || null;
    const snapshot: StaffSnapshot = {
      positionId: Number.isSafeInteger(positionId) && positionId >= 0 ? positionId : 0,
      positionName: typeof row.position_name === "string" ? row.position_name.trim() : "",
      personnelGroup: typeof row.personnelGroup === "number" ? row.personnelGroup : 0,
      staffName: typeof row.doctor_name === "string" && row.doctor_name.trim() ? row.doctor_name.trim() : code ?? "ไม่ระบุชื่อ",
      hosxpStaffCode: code,
      operationItemName: typeof row.operation_item_name === "string" && row.operation_item_name.trim() ? row.operation_item_name.trim() : null,
      enteredDate: typeof row.teamEnteredDate === "string" ? row.teamEnteredDate : null,
      enteredTime: typeof row.teamEnteredTime === "string" ? row.teamEnteredTime : null,
      exitedDate: typeof row.teamExitedDate === "string" ? row.teamExitedDate : null,
      exitedTime: typeof row.teamExitedTime === "string" ? row.teamExitedTime : null,
    };
    const items = byOperationId.get(operationId) ?? [];
    const duplicate = items.some((item) => item.positionId === snapshot.positionId && item.hosxpStaffCode === snapshot.hosxpStaffCode && item.staffName === snapshot.staffName && item.operationItemName === snapshot.operationItemName);
    if (!duplicate) items.push(snapshot);
    byOperationId.set(operationId, items);
  }
  for (const items of byOperationId.values()) items.sort((a, b) => a.personnelGroup - b.personnelGroup || a.positionName.localeCompare(b.positionName, "th") || a.staffName.localeCompare(b.staffName, "th") || (a.operationItemName ?? "").localeCompare(b.operationItemName ?? "", "th"));
  return byOperationId;
}

/** The caller must verify register:write and pass the authenticated user ID. */
export async function syncHosxpDay(day: string, userId: string) {
  const period = fiscalPeriod(day);
  const operationDate = new Date(`${day}T00:00:00.000Z`);

  async function attempt() {
    // Re-read the source on retry, in case HOSxP changed while another sync ran.
    const rows = await getHosxpOperationsForDay(day);
    // Allocate new numbers by immutable source ID, oldest first, never by
    // editable times or by incidental driver/join row order.
    const ids = [...new Set(rows.map((row) => normalizeOperationId(row.operation_id)))].sort((a, b) => {
      const left = BigInt(a); const right = BigInt(b);
      return left < right ? -1 : left > right ? 1 : 0;
    });
    const teams = ids.length ? await getHosxpOperationTeams(ids.map(Number)) : [];
    const teamsByOperationId = staffSnapshots(teams);
    const sourceUrgency = new Map<string, Urgency | null>();
    const sourceDepartment = new Map<string, string>();
    const sourceDepartmentName = new Map<string, string>();
    const departmentNames = new Map<string, string>();
    for (const row of rows) {
      const id = normalizeOperationId(row.operation_id);
      if (!sourceUrgency.has(id)) sourceUrgency.set(id, urgencyFromHosxp(row.emergency_name));
      if (!sourceDepartment.has(id)) {
        const departmentId = row.spclty == null || String(row.spclty).trim() === "" ? "UNSPECIFIED" : String(row.spclty).trim();
        sourceDepartment.set(id, departmentId);
        const departmentName = typeof row.department_name === "string" && row.department_name.trim() ? row.department_name.trim() : "ไม่ระบุแผนก";
        sourceDepartmentName.set(id, departmentName);
        departmentNames.set(departmentId, departmentName);
      }
    }
    if (!ids.length) {
      return prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
        const actor = await tx.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
        if (!actor?.isActive || !hasPermission(actor.role, "register:write")) throw new Error("Forbidden");
        const result = { total: 0, created: 0, renumbered: 0, dateUpdated: 0, departmentUpdated: 0, existing: 0 };
        await writeAudit(tx, { actorId: userId, event: "HOSXP_SYNC", outcome: "SUCCESS", targetType: "HOSXP_DAY", targetId: day, metadata: { date: day, ...result } });
        return result;
      });
    }

    return prisma.$transaction(async (tx) => {
      // Recheck the actor under a lock so concurrent account changes cannot
      // revoke write access while this transaction is committing.
      await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
      const actor = await tx.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
      if (!actor?.isActive || !hasPermission(actor.role, "register:write")) throw new Error("Forbidden");

      const existing = await tx.surgeryRegister.findMany({
        where: { hosxpOperationId: { in: ids } },
        select: { id: true, hosxpOperationId: true, fiscalYear: true, calendarMonth: true, departmentId: true, sequence: true, operationDate: true, revision: true, urgency: true, staff: { select: { positionId: true, positionName: true, personnelGroup: true, staffName: true, hosxpStaffCode: true, operationItemName: true, enteredDate: true, enteredTime: true, exitedDate: true, exitedTime: true } } },
      });
      const byId = new Map(existing.map((entry) => [entry.hosxpOperationId, entry]));
      const destinations = [...new Set(ids.map((id) => sourceDepartment.get(id) ?? "UNSPECIFIED"))].sort();
      const nextByDepartment = new Map<string, number>();
      for (const departmentId of destinations) {
        // Lock counters in a stable order to avoid deadlocks when departments overlap.
        await tx.$executeRaw`
          INSERT INTO SurgeryRegisterCounter (fiscalYear, calendarMonth, departmentId, lastSequence)
          VALUES (${period.fiscalYear}, ${period.calendarMonth}, ${departmentId}, 0)
          ON DUPLICATE KEY UPDATE lastSequence = lastSequence
        `;
        const counter = await tx.surgeryRegisterCounter.findUniqueOrThrow({ where: { fiscalYear_calendarMonth_departmentId: { ...period, departmentId } } });
        nextByDepartment.set(departmentId, counter.lastSequence);
      }
      let created = 0, renumbered = 0, dateUpdated = 0, departmentUpdated = 0, unchanged = 0;
      const syncStaff = async (registerId: string, current: StaffSnapshot[], next: StaffSnapshot[]) => {
        const signature = (items: StaffSnapshot[]) => items.map((member) => JSON.stringify(member)).sort();
        if (JSON.stringify(signature(current)) === JSON.stringify(signature(next))) return;
        await tx.surgeryRegisterStaff.deleteMany({ where: { registerId } });
        if (next.length) await tx.surgeryRegisterStaff.createMany({ data: next.map((member) => ({ registerId, ...member })) });
      };

      for (const id of ids) {
        const previous = byId.get(id);
        const departmentId = sourceDepartment.get(id) ?? "UNSPECIFIED";
        const sourceTeam = teamsByOperationId.get(id) ?? [];
        if (!previous) {
          const registerId = randomUUID();
          await tx.surgeryRegister.create({ data: {
            id: registerId, ...period, departmentId, sequence: (nextByDepartment.get(departmentId) ?? 0) + 1, operationDate,
            hosxpOperationId: id, createdById: userId, urgency: sourceUrgency.get(id) ?? null,
          } });
          await syncStaff(registerId, [], sourceTeam);
          nextByDepartment.set(departmentId, (nextByDepartment.get(departmentId) ?? 0) + 1);
          await writeAudit(tx, { actorId: userId, event: "REGISTER_CREATED", outcome: "SUCCESS", targetType: "REGISTER", targetId: registerId, metadata: { date: day } });
          created += 1;
          continue;
        }
        const previousDay = previous.operationDate.toISOString().slice(0, 10);
        const departmentChanged = previous.departmentId !== departmentId;
        if (previousDay === day && previous.fiscalYear === period.fiscalYear && previous.calendarMonth === period.calendarMonth && !departmentChanged) {
          await syncStaff(previous.id, previous.staff, sourceTeam);
          const latestUrgency = sourceUrgency.get(id) ?? null;
          if (previous.urgency !== latestUrgency) await tx.surgeryRegister.update({ where: { id: previous.id }, data: { urgency: latestUrgency } });
          unchanged += 1;
          continue;
        }
        const movesPeriod = previous.fiscalYear !== period.fiscalYear || previous.calendarMonth !== period.calendarMonth;
        const sequence = movesPeriod || departmentChanged ? (nextByDepartment.get(departmentId) ?? 0) + 1 : previous.sequence;
        const changed = await tx.surgeryRegister.updateMany({
          where: { id: previous.id, revision: previous.revision },
          data: { ...period, departmentId, sequence, operationDate, urgency: sourceUrgency.get(id) ?? null, revision: { increment: 1 } },
        });
        if (!changed.count) throw new SyncConflict("Register changed during sync");
        await syncStaff(previous.id, previous.staff, sourceTeam);
        if (movesPeriod || departmentChanged) nextByDepartment.set(departmentId, (nextByDepartment.get(departmentId) ?? 0) + 1);
        await tx.surgeryRegisterNumberChange.create({ data: {
          registerId: previous.id, changedById: userId,
          before: { fiscalYear: previous.fiscalYear, calendarMonth: previous.calendarMonth, departmentId: previous.departmentId, departmentName: departmentNames.get(previous.departmentId) ?? `แผนก ${previous.departmentId}`, sequence: previous.sequence, operationDate: previousDay, revision: previous.revision },
          after: { ...period, departmentId, departmentName: sourceDepartmentName.get(id) ?? "ไม่ระบุแผนก", sequence, operationDate: day, revision: previous.revision + 1 },
        } });
        await writeAudit(tx, { actorId: userId, event: "REGISTER_DATE_CHANGED", outcome: "SUCCESS", targetType: "REGISTER", targetId: previous.id, metadata: { date: day, revision: previous.revision + 1 } });
        if (departmentChanged) departmentUpdated += 1;
        if (movesPeriod || departmentChanged) renumbered += 1;
        else dateUpdated += 1;
      }
      for (const [departmentId, lastSequence] of nextByDepartment) {
        await tx.surgeryRegisterCounter.update({ where: { fiscalYear_calendarMonth_departmentId: { ...period, departmentId } }, data: { lastSequence } });
      }
      const result = { total: ids.length, created, renumbered, dateUpdated, departmentUpdated, existing: unchanged };
      await writeAudit(tx, { actorId: userId, event: "HOSXP_SYNC", outcome: "SUCCESS", targetType: "HOSXP_DAY", targetId: day, metadata: { date: day, ...result } });
      return result;
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
