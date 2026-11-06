import { dayRange } from "../hosxp/date-range.ts";

export const timeFields = ["roomEnteredAt", "operationStartedAt", "operationEndedAt", "roomExitedAt"] as const;
export type TimeField = (typeof timeFields)[number];
export type RegisterTimes = Record<TimeField, Date | null>;

/** Parse the hospital's local time (Asia/Bangkok, UTC+07:00). */
export function parseBangkokMinute(value: unknown): Date | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Invalid time");
  dayRange(value.slice(0, 10));
  if (Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59) throw new Error("Invalid time");
  return new Date(`${value}:00+07:00`);
}

export function parseRegisterTimes(input: unknown): RegisterTimes {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid times");
  const values = input as Record<string, unknown>;
  if (timeFields.some((field) => !Object.hasOwn(values, field))) throw new Error("Missing time");
  const parsed = Object.fromEntries(timeFields.map((field) => [field, parseBangkokMinute(values[field])])) as RegisterTimes;
  const present = timeFields.map((field) => parsed[field]).filter((date): date is Date => date !== null);
  if (present.some((date, index) => index > 0 && date < present[index - 1])) throw new Error("Times out of order");
  return parsed;
}
