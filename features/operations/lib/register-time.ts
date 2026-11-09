function dateValue(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const input = value.replace(" ", "T");
  const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(input) ? input : `${input}+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function registerTime(value: unknown, withDate = false) {
  const date = dateValue(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    ...(withDate ? { day: "numeric", month: "short", year: "numeric" } as const : {}),
  }).format(date);
}
