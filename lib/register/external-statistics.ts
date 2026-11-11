import { createHash, timingSafeEqual } from "node:crypto";
import type { StatisticsResponse } from "./statistics-contract";

export function validReportsKey(header: string | null, expected: string | undefined) {
  if (!expected || !header?.startsWith("Bearer ") || header.length > 512) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header.slice(7)), digest(expected));
}

/** Explicit allowlist: never spread the internal report into an external response. */
export function externalStatistics(data: StatisticsResponse) {
  return {
    schemaVersion: 1,
    period: data.period, value: data.value, start: data.start, end: data.end,
    generatedAt: data.generatedAt, timezone: "Asia/Bangkok",
    totalCases: data.totalCases, sourceCases: data.sourceCases,
    series: data.series.map(({ key, label, cases }) => ({ key, label, cases })),
    departments: data.departments.map(({ id, name, count }) => ({ id, name, count })),
    emergency: ["Elective", "Emergency", "Unknown"].map((name) => ({
      name,
      count: data.emergency.filter((row) => name === "Unknown" ? !["Elective", "Emergency"].includes(row.name) : row.name === name).reduce((sum, row) => sum + row.count, 0),
    })),
    averageDurationMinutes: data.averageDurationMinutes, durationCases: data.durationCases,
    postponed: data.postponed, cancelled: data.cancelled,
    utilization: data.utilization ? {
      usedMinutes: data.utilization.usedMinutes,
      availableMinutes: data.utilization.availableMinutes,
      percent: data.utilization.percent,
      rooms: data.utilization.rooms.map(({ id, name, usedMinutes, availableMinutes, percent }) => ({ id, name, usedMinutes, availableMinutes, percent })),
    } : null,
    roomTimeCases: data.roomTimeCases, estimatedRoomCases: data.estimatedRoomCases,
    missingUtilizationTimes: data.missingUtilizationTimes,
    hosxpAvailable: data.hosxpAvailable,
  };
}
