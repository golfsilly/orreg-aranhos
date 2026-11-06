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
