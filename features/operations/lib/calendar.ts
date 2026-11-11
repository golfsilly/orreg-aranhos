export type CalendarView = "day" | "week" | "month";

export type CalendarOperation = Record<string, unknown> & {
  operation_id: string | number | bigint;
};

export type OperatingRoom = { id: string; name: string };

export function bangkokDateTime(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const valueOf = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return {
    date: `${valueOf("year")}-${valueOf("month")}-${valueOf("day")}`,
    hour: Number(valueOf("hour")),
    minute: Number(valueOf("minute")),
    timestamp: date.getTime(),
  };
}

export function operationCalendarDate(operation: CalendarOperation) {
  return calendarInterval(operation)?.start.date
    ?? (typeof operation.request_operation_date === "string" ? operation.request_operation_date.slice(0, 10) : "");
}

export function occupancyInterval(operation: CalendarOperation) {
  return calendarInterval(operation);
}

export function calendarInterval(operation: CalendarOperation) {
  const roomStart = bangkokDateTime(operation.roomEnteredAt);
  const roomEnd = bangkokDateTime(operation.roomExitedAt);
  if (roomStart && roomEnd && roomEnd.timestamp > roomStart.timestamp) {
    return { start: roomStart, end: roomEnd, source: "room" as const };
  }

  // Room entry/exit is recorded separately in OR-Reg. If it is unavailable,
  // use surgery start/end so the daily view remains useful and mark it as an
  // operation interval rather than implying room occupancy.
  const operationStart = bangkokDateTime(operation.effectiveOperationStartedAt);
  const operationEnd = bangkokDateTime(operation.effectiveOperationEndedAt);
  if (operationStart && operationEnd && operationEnd.timestamp > operationStart.timestamp) {
    return { start: operationStart, end: operationEnd, source: "operation" as const };
  }
  return null;
}

export function calendarStartLabel(operation: CalendarOperation) {
  const interval = calendarInterval(operation);
  return interval ? `${String(interval.start.hour).padStart(2, "0")}:${String(interval.start.minute).padStart(2, "0")}` : "—";
}

export function calendarEndLabel(operation: CalendarOperation) {
  const interval = calendarInterval(operation);
  return interval ? `${String(interval.end.hour).padStart(2, "0")}:${String(interval.end.minute).padStart(2, "0")}` : "—";
}

export function operationOccursOnDate(operation: CalendarOperation, day: string) {
  const interval = occupancyInterval(operation);
  if (!interval) return operationCalendarDate(operation) === day;
  return interval.start.date <= day && interval.end.date >= day;
}

export function occupancyOnDate(operation: CalendarOperation, day: string) {
  const interval = occupancyInterval(operation);
  if (!interval || !operationOccursOnDate(operation, day)) return null;
  const continuesFromPreviousDay = interval.start.date < day;
  const continuesIntoNextDay = interval.end.date > day;
  return {
    interval,
    startMinute: continuesFromPreviousDay ? 0 : interval.start.hour * 60 + interval.start.minute,
    endMinute: continuesIntoNextDay ? 1440 : interval.end.hour * 60 + interval.end.minute,
    continuesFromPreviousDay,
    continuesIntoNextDay,
  };
}

export function timelineLanes(operations: CalendarOperation[], day: string, minDisplayMinutes = 64) {
  const entries = operations.flatMap((operation) => {
    const slot = occupancyOnDate(operation, day);
    if (!slot || slot.endMinute <= slot.startMinute) return [];
    return [{ id: String(operation.operation_id), start: slot.startMinute, end: Math.min(1440, Math.max(slot.endMinute, slot.startMinute + minDisplayMinutes)) }];
  }).sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
  const laneEnds: number[] = [];
  const assignments = new Map<string, { lane: number; count: number }>();
  for (const entry of entries) {
    let lane = laneEnds.findIndex((end) => end <= entry.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = entry.end;
    assignments.set(entry.id, { lane, count: 0 });
  }
  const count = laneEnds.length;
  for (const [id, placement] of assignments) assignments.set(id, { ...placement, count });
  return assignments;
}

export function overlappingOperationIds(operations: CalendarOperation[]) {
  const overlaps = new Set<string>();
  const byRoom = new Map<string, { id: string; start: number; end: number }[]>();
  for (const operation of operations) {
    const interval = occupancyInterval(operation);
    const roomId = typeof operation.sourceRoomId === "string" ? operation.sourceRoomId : "UNSPECIFIED";
    if (!interval) continue;
    const items = byRoom.get(roomId) ?? [];
    items.push({ id: String(operation.operation_id), start: interval.start.timestamp, end: interval.end.timestamp });
    byRoom.set(roomId, items);
  }
  for (const items of byRoom.values()) {
    items.sort((a, b) => a.start - b.start);
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length && items[j]!.start < items[i]!.end; j += 1) {
        if (items[i]!.start < items[j]!.end) {
          overlaps.add(items[i]!.id);
          overlaps.add(items[j]!.id);
        }
      }
    }
  }
  return overlaps;
}

export function dateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function shiftDate(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
}

export function calendarWeekStart(day: string) {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return dateKey(date);
}

export function monthKey(day: string) { return day.slice(0, 7); }

export function visibleCalendarDays(day: string, view: CalendarView) {
  if (view === "day") return [day];
  if (view === "week") {
    const first = calendarWeekStart(day);
    return Array.from({ length: 7 }, (_, index) => shiftDate(first, index));
  }
  const first = new Date(`${monthKey(day)}-01T12:00:00.000Z`);
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: daysInMonth }, (_, index) => shiftDate(dateKey(first), index));
}

export function timeLabel(value: unknown) {
  const date = bangkokDateTime(value);
  return date ? `${String(date.hour).padStart(2, "0")}:${String(date.minute).padStart(2, "0")}` : "—";
}

export function thaiDate(day: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Intl.DateTimeFormat("th-TH", { ...options, calendar: "buddhist", timeZone: "Asia/Bangkok" }).format(new Date(`${day}T12:00:00.000Z`));
}

export function calendarMonths(day: string, view: CalendarView) {
  const visibleDays = visibleCalendarDays(day, view);
  const months = new Set(visibleDays.map(monthKey));
  if (visibleDays.some((visibleDay) => visibleDay.endsWith("-01"))) {
    const firstDay = visibleDays.find((visibleDay) => visibleDay.endsWith("-01"))!;
    months.add(monthKey(shiftDate(firstDay, -1)));
  }
  return [...months];
}
