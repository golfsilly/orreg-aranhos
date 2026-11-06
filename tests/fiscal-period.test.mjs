import { test } from "node:test";
import assert from "node:assert/strict";
import { fiscalPeriod, formatRegisterNumber } from "../lib/register/fiscal-period.ts";

test("uses the October fiscal-year boundary and Buddhist year", () => {
  assert.deepEqual(fiscalPeriod("2026-09-30"), { fiscalYear: 2569, calendarMonth: 9 });
  assert.deepEqual(fiscalPeriod("2026-10-01"), { fiscalYear: 2570, calendarMonth: 10 });
  assert.deepEqual(fiscalPeriod("2026-11-01"), { fiscalYear: 2570, calendarMonth: 11 });
  assert.deepEqual(fiscalPeriod("2027-01-01"), { fiscalYear: 2570, calendarMonth: 1 });
  assert.throws(() => fiscalPeriod("2026-02-29"));
});

test("formats only the sequence and calendar month", () => {
  assert.equal(formatRegisterNumber(1, 11), "1/11");
  assert.throws(() => formatRegisterNumber(0, 11));
  assert.throws(() => formatRegisterNumber(1, 13));
});
