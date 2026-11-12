import "server-only";
import { getHosxpOperationTeams, getHosxpOperationsForDay, getHosxpOperationsForMonth } from "@/lib/hosxp/operations";
import { normalizeOperationId } from "@/lib/hosxp/operation-id";
import { prisma } from "@/lib/prisma";
import { fiscalPeriod, formatRegisterNumber } from "@/lib/register/fiscal-period";

export type DailyRegisterRow = {
  registerNumber: string;
  departmentId: string;
  departmentName: string;
  name: string;
  age: string | null;
  hn: string;
  operationDate: string;
  startedAt: string | null;
  endedAt: string | null;
  ward: string | null;
  room: string | null;
  urgency: string | null;
  diagnosis: string | null;
  woundNames: string | null;
  remark: string | null;
  patho: boolean;
  preOp: boolean;
  postOp: boolean;
  anesthesia: string | null;
  surgeryClass: string | null;
  minorPeriod: string | null;
  team: string | null;
};

export type SingleRegisterReadStage = "HOSXP_SOURCE" | "APP_REGISTER" | "HOSXP_TEAM";
export class SingleRegisterReadError extends Error {
  constructor(readonly stage: SingleRegisterReadStage) {
    super("Could not load single register data");
    this.name = "SingleRegisterReadError";
  }
}

/** Reads HOSxP operation times and OR-Reg annotations; never writes to HOSxP. */
async function registerRowsForSource(
  source: Record<string, unknown>[],
  fallbackDay: string,
  onSingleReadStage?: (stage: Exclude<SingleRegisterReadStage, "HOSXP_SOURCE">) => void,
): Promise<DailyRegisterRow[]> {
  const ids = [...new Set(source.map((row) => normalizeOperationId(row.operation_id)))];
  const findRegisters = () => ids.length ? prisma.surgeryRegister.findMany({
    where: { hosxpOperationId: { in: ids } },
    select: { hosxpOperationId: true, sequence: true, calendarMonth: true, fiscalYear: true, departmentId: true, operationDate: true, patho: true, preOp: true, postOp: true, anesthesia: true, surgeryClass: true, minorPeriod: true, diagnosis: true, remark: true, staff: { select: { personnelGroup: true, staffName: true, positionName: true, operationItemName: true } } },
  }) : Promise.resolve([]);
  let registers;
  let teamRows;
  if (onSingleReadStage) {
    onSingleReadStage("APP_REGISTER");
    registers = await findRegisters();
    onSingleReadStage("HOSXP_TEAM");
    teamRows = await getHosxpOperationTeams(ids.map(Number));
  } else {
    [registers, teamRows] = await Promise.all([findRegisters(), getHosxpOperationTeams(ids.map(Number))]);
  }
  const byId = new Map(registers.map((item) => [item.hosxpOperationId, item]));
  const groupNames: Record<number, string> = { 1: "ผู้ทำการผ่าตัด", 2: "Scrub Nurse", 3: "Instrument Nurse", 4: "Circulate Nurse", 5: "ทีมช่วยผ่าตัด" };
  const teamByOperationId = new Map<string, string[]>();
  for (const member of teamRows) {
    const operationId = normalizeOperationId(member.operation_id);
    const group = typeof member.personnelGroup === "number" ? groupNames[member.personnelGroup] ?? "ตำแหน่งอื่น" : "ตำแหน่งอื่น";
    const name = typeof member.doctor_name === "string" ? member.doctor_name : "ไม่ระบุชื่อ";
    const position = typeof member.position_name === "string" ? member.position_name : "";
    const item = typeof member.operation_item_name === "string" ? member.operation_item_name : "";
    const entries = teamByOperationId.get(operationId) ?? [];
    entries.push(`${group}: ${name}${position ? ` (${position})` : ""}${item ? ` · ${item}` : ""}`);
    teamByOperationId.set(operationId, entries);
  }
  return source.map((item) => {
    const operationId = normalizeOperationId(item.operation_id);
    const register = byId.get(operationId);
    const operationDate = typeof item.request_operation_date === "string" ? item.request_operation_date.slice(0, 10) : fallbackDay;
    const expected = fiscalPeriod(operationDate);
    const departmentId = item.spclty == null || String(item.spclty).trim() === "" ? "UNSPECIFIED" : String(item.spclty).trim();
    const isCurrentSourceDate = Boolean(register && register.operationDate.toISOString().slice(0, 10) === operationDate && register.fiscalYear === expected.fiscalYear && register.calendarMonth === expected.calendarMonth && register.departmentId === departmentId);
    const storedTeam = register?.staff.map((member) => {
      const group = groupNames[member.personnelGroup] ?? "ตำแหน่งอื่น";
      return `${group}: ${member.staffName}${member.positionName ? ` (${member.positionName})` : ""}${member.operationItemName ? ` · ${member.operationItemName}` : ""}`;
    });
    return {
      registerNumber: isCurrentSourceDate && register ? formatRegisterNumber(register.sequence, register.calendarMonth) : "—",
      departmentId,
      departmentName: typeof item.department_name === "string" && item.department_name.trim() ? item.department_name.trim() : "ไม่ระบุแผนก",
      name: typeof item.ptname === "string" ? item.ptname : "",
      age: typeof item.age_text === "string" ? item.age_text : null,
      hn: typeof item.hn === "string" || typeof item.hn === "number" ? String(item.hn) : "",
      operationDate,
      startedAt: typeof item.operation_started_at === "string" ? item.operation_started_at : null,
      endedAt: typeof item.operation_ended_at === "string" ? item.operation_ended_at : null,
      ward: typeof item.ward_name === "string" ? item.ward_name : null,
      room: typeof item.room_name === "string" ? item.room_name : null,
      urgency: typeof item.emergency_name === "string" ? item.emergency_name : null,
      diagnosis: register?.diagnosis ?? null,
      woundNames: typeof item.wound_names === "string" ? item.wound_names : null,
      remark: register?.remark ?? null,
      patho: register?.patho ?? false,
      preOp: register?.preOp ?? false,
      postOp: register?.postOp ?? false,
      anesthesia: register?.anesthesia ?? null,
      surgeryClass: register?.surgeryClass ?? null,
      minorPeriod: register?.minorPeriod ?? null,
      team: storedTeam?.length ? storedTeam.join("  |  ") : teamByOperationId.get(operationId)?.join("  |  ") ?? null,
    };
  }).sort((a, b) => a.operationDate.localeCompare(b.operationDate) || a.departmentName.localeCompare(b.departmentName, "th") || a.registerNumber.localeCompare(b.registerNumber, "th", { numeric: true }));
}

/** Reads the authorized HOSxP daily source and OR-Reg annotations; never writes to HOSxP. */
export async function getDailyRegisterRows(day: string): Promise<DailyRegisterRow[]> {
  return registerRowsForSource(await getHosxpOperationsForDay(day), day);
}

/** Reads one authorized source operation for its individual PDF export. */
export async function getSingleDailyRegisterRow(
  day: string,
  operationId: string,
  onReadStage?: (stage: SingleRegisterReadStage) => void,
): Promise<DailyRegisterRow | null> {
  const id = normalizeOperationId(operationId);
  let source: Record<string, unknown>[];
  try {
    onReadStage?.("HOSXP_SOURCE");
    source = (await getHosxpOperationsForDay(day)).filter((row) => normalizeOperationId(row.operation_id) === id);
  } catch {
    throw new SingleRegisterReadError("HOSXP_SOURCE");
  }
  if (!source.length) return null;
  let readStage: Exclude<SingleRegisterReadStage, "HOSXP_SOURCE"> = "APP_REGISTER";
  try {
    return (await registerRowsForSource(source.slice(0, 1), day, (stage) => {
      readStage = stage;
      onReadStage?.(stage);
    }))[0] ?? null;
  } catch {
    throw new SingleRegisterReadError(readStage);
  }
}

/** Reads the authorized monthly source plus OR-Reg overrides; never writes to HOSxP. */
export async function getMonthlyRegisterRows(month: string): Promise<DailyRegisterRow[]> {
  return registerRowsForSource(await getHosxpOperationsForMonth(month), `${month}-01`);
}
