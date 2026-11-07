import { test } from "node:test";
import assert from "node:assert/strict";
import { hasPermission } from "../lib/permissions.ts";

test("enforces the requested role matrix and denies unknown roles", () => {
  const permissions = ["dashboard:read", "users:manage", "register:read", "register:write", "audit:read"];
  const matrix = {
    SUPERADMIN: [true, true, true, true, true],
    ADMIN: [true, true, false, false, false],
    NURSE: [true, false, true, true, false],
    USER: [true, false, false, false, false],
    UNKNOWN: [false, false, false, false, false],
  };
  for (const [role, expected] of Object.entries(matrix)) {
    assert.deepEqual(permissions.map((permission) => hasPermission(role, permission)), expected);
  }
});
