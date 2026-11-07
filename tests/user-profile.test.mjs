import assert from "node:assert/strict";
import test from "node:test";
import { selfProfileSchema, workFieldsSchema } from "../lib/user-profile.ts";

test("work details are optional free text and blank values are cleared", () => {
  assert.deepEqual(workFieldsSchema.parse({}), {});
  assert.deepEqual(workFieldsSchema.parse({ organization: "  โรงพยาบาล  ", mission: "", workGroup: "  ", jobTitle: "พยาบาล", jobLevel: "ชำนาญการ" }), { organization: "โรงพยาบาล", mission: null, workGroup: null, jobTitle: "พยาบาล", jobLevel: "ชำนาญการ" });
  assert.equal(workFieldsSchema.safeParse({ jobTitle: "x".repeat(192) }).success, false);
});

test("self-service profile cannot change roles or identity fields", () => {
  assert.equal(selfProfileSchema.safeParse({ name: "ชื่อ", role: "SUPERADMIN" }).success, false);
  assert.equal(selfProfileSchema.safeParse({ name: "ชื่อ", email: "other@example.test" }).success, false);
  assert.equal(selfProfileSchema.safeParse({ name: "  " }).success, false);
  assert.equal(selfProfileSchema.safeParse({ name: "ชื่อ", mission: "ภารกิจ" }).success, true);
});
