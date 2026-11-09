export type StatisticsPeriod = "day" | "month" | "year";

export type StatisticsBucket = { key: string; label: string; cases: number };

export function statisticsRange(period: StatisticsPeriod, value: string): [string, string] {
  if (period === "day") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid day");
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid day");
    date.setUTCDate(date.getUTCDate() + 1);
    return [value, date.toISOString().slice(0, 10)];
  }
  if (period === "month") {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error("Invalid month");
    const [year, month] = value.split("-").map(Number);
    const next = new Date(Date.UTC(year!, month!, 1));
    return [`${value}-01`, next.toISOString().slice(0, 10)];
  }
  if (!/^\d{4}$/.test(value)) throw new Error("Invalid year");
  const year = Number(value);
  if (year < 1000 || year > 9998) throw new Error("Invalid year");
  return [`${value}-01-01`, `${year + 1}-01-01`];
}

export function caseSeries(period: StatisticsPeriod, value: string, operationDates: Date[], operationTimes: (Date | null)[]) {
  if (period === "day") {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({ key: String(hour).padStart(2, "0"), label: `${String(hour).padStart(2, "0")}:00`, cases: 0 }));
    for (const time of operationTimes) {
      if (!time) continue;
      const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", hour: "2-digit", hourCycle: "h23" }).format(time));
      if (hour >= 0 && hour <= 23) buckets[hour]!.cases += 1;
    }
    return buckets;
  }

  if (period === "month") {
    const [year, month] = value.split("-").map(Number);
    const count = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
    const buckets = Array.from({ length: count }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return { key: `${value}-${day}`, label: String(index + 1), cases: 0 };
    });
    for (const date of operationDates) {
      const day = date.toISOString().slice(0, 10);
      const bucket = buckets[Number(day.slice(8, 10)) - 1];
      if (bucket) bucket.cases += 1;
    }
    return buckets;
  }

  const year = Number(value);
  const buckets = Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0");
    const date = new Date(Date.UTC(year, index, 15, 12));
    return { key: `${year}-${month}`, label: new Intl.DateTimeFormat("th-TH", { month: "short", timeZone: "Asia/Bangkok" }).format(date), cases: 0 };
  });
  for (const date of operationDates) {
    const bucket = buckets[date.getUTCMonth()];
    if (bucket) bucket.cases += 1;
  }
  return buckets;
}

type RoomInterval = { roomId: string; start: Date; end: Date };

const bangkokDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const bangkokMidnight = (day: string) => new Date(`${day}T00:00:00+07:00`).getTime();

export function roomUtilization(startDay: string, endDay: string, rooms: { id: string; name: string }[], intervals: RoomInterval[]) {
  const start = new Date(`${startDay}T00:00:00.000Z`);
  const end = new Date(`${endDay}T00:00:00.000Z`);
  const dayCount = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  if (!rooms.length || !dayCount) return null;

  const roomIds = new Set(rooms.map((room) => room.id));
  const byRoomDay = new Map<string, { roomId: string; day: string; start: number; end: number }[]>();
  for (const interval of intervals) {
    if (!roomIds.has(interval.roomId) || interval.end <= interval.start) continue;
    let day = bangkokDate(interval.start);
    const lastDay = bangkokDate(interval.end);
    for (let index = 0; index <= dayCount && day <= lastDay; index += 1) {
      const dayStart = bangkokMidnight(day);
      const dayEnd = dayStart + 86_400_000;
      const clippedStart = Math.max(interval.start.getTime(), dayStart);
      const clippedEnd = Math.min(interval.end.getTime(), dayEnd);
      if (clippedEnd > clippedStart && day >= startDay && day < endDay) {
        const key = `${interval.roomId}|${day}`;
        const values = byRoomDay.get(key) ?? [];
        values.push({ roomId: interval.roomId, day, start: clippedStart, end: clippedEnd });
        byRoomDay.set(key, values);
      }
      const next = new Date(`${day}T12:00:00.000Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      day = next.toISOString().slice(0, 10);
    }
  }

  const usedByRoom = new Map(rooms.map((room) => [room.id, 0]));
  let usedMinutes = 0;
  for (const intervalsForRoomDay of byRoomDay.values()) {
    intervalsForRoomDay.sort((a, b) => a.start - b.start);
    let currentStart = intervalsForRoomDay[0]!.start;
    let currentEnd = intervalsForRoomDay[0]!.end;
    const roomId = intervalsForRoomDay[0]!.roomId;
    const flush = () => {
      const minutes = Math.round((currentEnd - currentStart) / 60_000);
      usedMinutes += minutes;
      usedByRoom.set(roomId, (usedByRoom.get(roomId) ?? 0) + minutes);
    };
    for (const interval of intervalsForRoomDay.slice(1)) {
      if (interval.start <= currentEnd) currentEnd = Math.max(currentEnd, interval.end);
      else {
        flush();
        currentStart = interval.start;
        currentEnd = interval.end;
      }
    }
    flush();
  }

  const availableMinutes = rooms.length * dayCount * 24 * 60;
  return {
    usedMinutes,
    availableMinutes,
    percent: Math.min(100, (usedMinutes / availableMinutes) * 100),
    rooms: rooms.map((room) => {
      const roomUsedMinutes = usedByRoom.get(room.id) ?? 0;
      const roomAvailableMinutes = dayCount * 24 * 60;
      return { id: room.id, name: room.name, usedMinutes: roomUsedMinutes, availableMinutes: roomAvailableMinutes, percent: Math.min(100, (roomUsedMinutes / roomAvailableMinutes) * 100) };
    }).sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name, "th")),
  };
}
