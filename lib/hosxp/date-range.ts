/** Convert a calendar date into a half-open, one-day range for MySQL. */
export function dayRange(day: string): [string, string] {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    day < "1000-01-01" ||
    day >= "9999-12-31"
  ) {
    throw new Error("Expected a valid date in YYYY-MM-DD format");
  }
  const date = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== day) {
    throw new Error("Expected a valid date in YYYY-MM-DD format");
  }
  date.setUTCDate(date.getUTCDate() + 1);
  return [day, date.toISOString().slice(0, 10)];
}

/** Convert a calendar month into a half-open YYYY-MM-01 range for MySQL. */
export function monthRange(month: string): [string, string] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Expected a month in YYYY-MM format");
  const [year, monthNumber] = month.split("-").map(Number);
  if (year! < 1000 || year! > 9998) throw new Error("Expected a valid month");
  const next = new Date(Date.UTC(year!, monthNumber!, 1));
  return [`${month}-01`, next.toISOString().slice(0, 10)];
}
