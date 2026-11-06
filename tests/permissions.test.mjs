import { test } from "node:test";
import assert from "node:assert/strict";
import { hasPermission } from "../lib/permissions.ts";

test("enforces the requested role matrix and denies unknown roles", () => {
  const permissions = ["dashboard:read", "users:manage", "register:read", "register:write"];
  const matrix = {
    SUPERADMIN: [true, true, true, true],
    ADMIN: [true, true, false, false],
    NURSE: [true, false, true, true],
    USER: [true, false, false, false],
    UNKNOWN: [false, false, false, false],
  };
  for (const [role, expected] of Object.entries(matrix)) {
    assert.deepEqual(permissions.map((permission) => hasPermission(role, permission)), expected);
  }
});
