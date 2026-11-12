import "server-only";
import { getHosxpOperationAnalyticsForRange, getHosxpOperatingRooms } from "@/lib/hosxp/operations";
import { normalizeOperationId } from "@/lib/hosxp/operation-id";
import { prisma } from "@/lib/prisma";
import { caseSeries, roomUtilization, statisticsRange, type StatisticsPeriod } from "@/lib/register/statistics";
import type { StatisticsResponse } from "@/lib/register/statistics-contract";

const countRows = (values: string[]) => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value || "ไม่ระบุ", (counts.get(value || "ไม่ระบุ") ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"));
};

function durationMinutes(startValue: unknown, endValue: unknown, operationDate: unknown) {
  const parse = (value: unknown): number | null => {
    if (value instanceof Date) return value.getTime();
    if (typeof value !== "string") return null;
    const raw = value.trim();
    const match = /^(?:(\d{4})-(\d{2})-(\d{2})[ T])?(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(raw);
    if (!match) return null;
    const baseDate = typeof operationDate === "string" ? operationDate.slice(0, 10) : operationDate instanceof Date ? operationDate.toISOString().slice(0, 10) : "2000-01-01";
    const date = match[1] ? `${match[1]}-${match[2]}-${match[3]}` : baseDate;
    const [year, month, day] = date.split("-").map(Number);
    return Date.UTC(year!, month! - 1, day!, Number(match[4]), Number(match[5]), Number(match[6] ?? 0));
  };
  const start = parse(startValue), end = parse(endValue);
  if (start === null || end === null) return null;
  let minutes = Math.round((end - start) / 60_000);
  if (minutes < 0) minutes += 24 * 60;
  return minutes > 0 && minutes <= 24 * 60 ? minutes : null;
}

const text = (value: unknown) => typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();

function hosxpDateTime(value: unknown, operationDate: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;
  const raw = value.trim();
  const dateTime = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2}(?::\d{2})?)(Z|[+-]\d{2}:?\d{2})?$/.exec(raw);
  if (dateTime) {
    const normalized = `${dateTime[1]}T${dateTime[2]}${dateTime[3] ? dateTime[3].replace(/([+-]\d{2})(\d{2})$/, "$1:$2") : "+07:00"}`;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const clock = /^(\d{1,2}:\d{2}(?::\d{2})?)$/.exec(raw);
  const date = typeof operationDate === "string"
    ? operationDate.slice(0, 10)
    : operationDate instanceof Date
      ? operationDate.toISOString().slice(0, 10)
      : "";
  if (!clock || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T${clock[1]}+07:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function loadStatistics(period: StatisticsPeriod, value: string, department?: string): Promise<StatisticsResponse> {
  const [start, end] = statisticsRange(period, value);
  const range = { gte: new Date(`${start}T00:00:00.000Z`), lt: new Date(`${end}T00:00:00.000Z`) };
    const [allRegisters, doctorRows] = await prisma.$transaction((tx) => Promise.all([
      tx.surgeryRegister.findMany({
        where: { operationDate: range },
        select: { id: true, departmentId: true, anesthesia: true, surgeryClass: true, operationDate: true, hosxpOperationId: true, roomEnteredAt: true, roomExitedAt: true },
      }),
      tx.surgeryRegisterStaff.findMany({
        where: { positionId: 1, register: { operationDate: range, ...(department ? { departmentId: department } : {}) } },
        select: { registerId: true, staffName: true, hosxpStaffCode: true },
      }),
    ]));
    const registers = department ? allRegisters.filter((row) => row.departmentId === department) : allRegisters;

    const doctorCases = new Map<string, { name: string; registers: Set<string> }>();
    for (const row of doctorRows) {
      const key = row.hosxpStaffCode || row.staffName;
      const item = doctorCases.get(key) ?? { name: row.staffName, registers: new Set<string>() };
      item.registers.add(row.registerId);
      doctorCases.set(key, item);
    }
    const doctors = [...doctorCases.entries()].map(([id, doctor]) => ({ id, name: doctor.name, cases: doctor.registers.size })).sort((a, b) => b.cases - a.cases || a.name.localeCompare(b.name, "th"));

    let rooms: { id: string; name: string }[] = [];
    let sourceRows: Record<string, unknown>[] = [];
    let hosxpAvailable = true;
    try {
      [rooms, sourceRows] = await Promise.all([getHosxpOperatingRooms(), getHosxpOperationAnalyticsForRange(start, end)]);
    } catch {
      hosxpAvailable = false;
    }
    const departmentNames = new Map(sourceRows.map((row) => [text(row.spclty), text(row.department_name)]));
    const departmentCounts = new Map<string, number>();
    for (const row of allRegisters) departmentCounts.set(row.departmentId, (departmentCounts.get(row.departmentId) ?? 0) + 1);
    const departments = [...departmentCounts].map(([id, count]) => ({ id, name: departmentNames.get(id) || (id === "UNSPECIFIED" ? "ไม่ระบุแผนก" : `แผนก ${id}`), count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"));
    const registeredIds = new Set(registers.flatMap((register) => register.hosxpOperationId ? [register.hosxpOperationId] : []));
    const sourceById = new Map<string, Record<string, unknown>>();
    const operationItems = new Map<string, Set<string>>();
    for (const row of sourceRows) {
      const id = normalizeOperationId(row.operation_id);
      if (!registeredIds.has(id)) continue;
      const source = sourceById.get(id) ?? row;
      for (const key of ["emergency_name", "status_name", "ward_name", "operation_started_at", "operation_ended_at", "room_id", "request_operation_date"]) {
        if (!text(source[key]) && text(row[key])) source[key] = row[key];
      }
      sourceById.set(id, source);
      const name = text(row.operation_item_name);
      if (name) {
        const items = operationItems.get(name) ?? new Set<string>();
        items.add(id);
        operationItems.set(name, items);
      }
    }
    const roomByOperation = new Map([...sourceById.entries()].map(([id, row]) => [id, row.room_id == null ? "UNSPECIFIED" : String(row.room_id)]));
    const effectiveTimes = new Map(registers.map((register) => {
      const source = register.hosxpOperationId ? sourceById.get(register.hosxpOperationId) : undefined;
      return [register.id, {
        start: hosxpDateTime(source?.operation_started_at, source?.request_operation_date),
        end: hosxpDateTime(source?.operation_ended_at, source?.request_operation_date),
      }];
    }));
    const roomIds = new Set(rooms.map((room) => room.id));
    let roomTimeCases = 0;
    let estimatedRoomCases = 0;
    let missingUtilizationTimes = 0;
    const intervals = registers.flatMap((register) => {
      const roomId = register.hosxpOperationId ? roomByOperation.get(register.hosxpOperationId) : undefined;
      if (!roomId || !roomIds.has(roomId)) { missingUtilizationTimes += 1; return []; }
      if (register.roomEnteredAt && register.roomExitedAt && register.roomExitedAt > register.roomEnteredAt) {
        roomTimeCases += 1;
        return [{ roomId, start: register.roomEnteredAt, end: register.roomExitedAt }];
      }
      const { start, end } = effectiveTimes.get(register.id)!;
      if (start && end && end > start) {
        estimatedRoomCases += 1;
        return [{ roomId, start, end }];
      }
      missingUtilizationTimes += 1;
      return [];
    });
    const utilization = hosxpAvailable ? roomUtilization(start, end, rooms, intervals) : null;
    const sourceCases = [...sourceById.entries()].map(([id, row]) => ({ id, row }));
    const emergency = countRows(sourceCases.map(({ row }) => {
      const value = text(row.emergency_name);
      if (/elective|นัดหมาย|ไม่ฉุกเฉิน/i.test(value)) return "Elective";
      if (/emergency|ฉุกเฉิน/i.test(value)) return "Emergency";
      return "ไม่ระบุ";
    }));
    const status = countRows(sourceCases.map(({ row }) => text(row.status_name)));
    const postponed = sourceCases.filter(({ row }) => /postpon|delay|defer|เลื่อน/i.test(text(row.status_name))).length;
    const cancelled = sourceCases.filter(({ row }) => /cancel|ยกเลิก|งดผ่าตัด/i.test(text(row.status_name))).length;
    const durationValues = registers.flatMap((register) => {
      const times = effectiveTimes.get(register.id)!;
      const minutes = times.start && times.end && times.end > times.start ? durationMinutes(times.start, times.end, register.operationDate) : null;
      return minutes === null ? [] : [minutes];
    });
    const durationBuckets = [
      { name: "ไม่เกิน 30 นาที", count: durationValues.filter((minutes) => minutes <= 30).length },
      { name: "31–60 นาที", count: durationValues.filter((minutes) => minutes > 30 && minutes <= 60).length },
      { name: "61–120 นาที", count: durationValues.filter((minutes) => minutes > 60 && minutes <= 120).length },
      { name: "มากกว่า 2 ชั่วโมง", count: durationValues.filter((minutes) => minutes > 120).length },
    ];
    const wards = countRows(sourceCases.map(({ row }) => text(row.ward_name)));
    const procedures = [...operationItems.entries()].map(([name, ids]) => ({ name, count: ids.size })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"));
    const response = {
      period: period.toUpperCase() as Uppercase<StatisticsPeriod>,
      value,
      totalCases: registers.length,
      sourceCases: sourceCases.length,
      doctorCount: doctorCases.size,
      series: caseSeries(period, value, registers.map((row) => row.operationDate), registers.map((row) => effectiveTimes.get(row.id)?.start ?? null)),
      generatedAt: new Date().toISOString(), start, end, departments,
      quality: {
        missingSource: registers.length - sourceCases.length,
        missingDoctor: registers.length - new Set(doctorRows.map((row) => row.registerId)).size,
        missingDuration: registers.length - durationValues.length,
        missingAnesthesia: registers.filter((row) => !row.anesthesia).length,
        missingSurgeryClass: registers.filter((row) => !row.surgeryClass).length,
      },
      doctors,
      emergency,
      procedures: procedures.slice(0, 10),
      wards,
      statuses: status,
      postponed,
      cancelled,
      averageDurationMinutes: durationValues.length ? durationValues.reduce((total, minutes) => total + minutes, 0) / durationValues.length : null,
      durationCases: durationValues.length,
      durationBuckets,
      utilization,
      missingRoomTimes: registers.filter((row) => !row.roomEnteredAt || !row.roomExitedAt).length,
      roomTimeCases,
      estimatedRoomCases,
      missingUtilizationTimes,
      hosxpAvailable,
    } satisfies StatisticsResponse;
  return response;
}
