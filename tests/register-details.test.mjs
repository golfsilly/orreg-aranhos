import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRegisterDetails, urgencyFromHosxp } from "../lib/register/details.ts";

test("accepts only the supplied checkboxes and dropdown values", () => {
  const details = { patho: true, preOp: false, postOp: true, anesthesia: "GA_WITH_MASK", urgency: "ELECTIVE", surgeryClass: null, minorPeriod: null };
  assert.deepEqual(parseRegisterDetails(details), details);
  assert.throws(() => parseRegisterDetails({ ...details, anesthesia: "unknown" }));
  assert.throws(() => parseRegisterDetails({ ...details, patho: "true" }));
  assert.throws(() => parseRegisterDetails({ ...details, urgency: "urgent" }));
});

test("supports major and minor surgery with a period only for minor surgery", () => {
  const base = { patho: false, preOp: false, postOp: false, anesthesia: null, urgency: null };
  for (const minorPeriod of ["OFFICIAL_HOURS", "OUTSIDE_HOURS", null]) {
    assert.deepEqual(parseRegisterDetails({ ...base, surgeryClass: "MINOR", minorPeriod }), { ...base, surgeryClass: "MINOR", minorPeriod });
  }
  assert.deepEqual(parseRegisterDetails({ ...base, surgeryClass: "MAJOR", minorPeriod: null }), { ...base, surgeryClass: "MAJOR", minorPeriod: null });
  assert.throws(() => parseRegisterDetails({ ...base, surgeryClass: "MAJOR", minorPeriod: "OFFICIAL_HOURS" }));
  assert.throws(() => parseRegisterDetails({ ...base, surgeryClass: null, minorPeriod: "OUTSIDE_HOURS" }));
  assert.throws(() => parseRegisterDetails({ ...base, surgeryClass: "MINOR", minorPeriod: "UNKNOWN" }));
});

test("maps only recognized HOSxP emergency names", () => {
  assert.equal(urgencyFromHosxp(" elective "), "ELECTIVE");
  assert.equal(urgencyFromHosxp("EMERGENCY"), "EMERGENCY");
  assert.equal(urgencyFromHosxp("unknown"), null);
});
