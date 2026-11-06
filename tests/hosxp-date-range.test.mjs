import { test } from "node:test";
import assert from "node:assert/strict";
import { dayRange } from "../lib/hosxp/date-range.ts";

test("builds half-open day ranges across month, leap day, and year boundaries", () => {
  assert.deepEqual(dayRange("2026-11-06"), ["2026-11-06", "2026-11-07"]);
  assert.deepEqual(dayRange("2024-02-29"), ["2024-02-29", "2024-03-01"]);
  assert.deepEqual(dayRange("2026-12-31"), ["2026-12-31", "2027-01-01"]);
});

test("rejects invalid calendar dates and non-date input", () => {
  for (const day of ["2026-02-29", "2026-11-31", "2026-1-01", "2026-01-01 OR 1=1", "9999-12-31", ""]) {
    assert.throws(() => dayRange(day));
  }
});
