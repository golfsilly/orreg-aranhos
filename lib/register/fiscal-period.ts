import { dayRange } from "../hosxp/date-range.ts";

/** Fiscal year is Buddhist Era and starts on 1 October. */
export function fiscalPeriod(day: string): { fiscalYear: number; calendarMonth: number } {
  dayRange(day);
  const year = Number(day.slice(0, 4));
  const calendarMonth = Number(day.slice(5, 7));
  return { fiscalYear: year + 543 + (calendarMonth >= 10 ? 1 : 0), calendarMonth };
}

export function currentFiscalPeriod(): { fiscalYear: number; calendarMonth: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return fiscalPeriod(`${part("year")}-${part("month")}-${part("day")}`);
}

/** The fiscal year is stored separately, not included in the displayed number. */
export function formatRegisterNumber(sequence: number, calendarMonth: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1 || !Number.isInteger(calendarMonth) || calendarMonth < 1 || calendarMonth > 12) {
    throw new Error("Invalid register number");
  }
  return `${sequence}/${calendarMonth}`;
}
