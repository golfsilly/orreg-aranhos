import assert from "node:assert/strict";
import test from "node:test";
import { passwordSchema } from "../lib/password-policy.ts";

test("passwords need six characters without composition rules", () => {
  assert.equal(passwordSchema.safeParse("12345").success, false);
  assert.equal(passwordSchema.safeParse("123456").success, true);
  assert.equal(passwordSchema.safeParse("abcdef").success, true);
  assert.equal(passwordSchema.safeParse("!".repeat(6)).success, true);
  assert.equal(passwordSchema.safeParse("x".repeat(128)).success, true);
  assert.equal(passwordSchema.safeParse("x".repeat(129)).success, false);
});
