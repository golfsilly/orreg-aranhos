import assert from "node:assert/strict";
import test from "node:test";
import { globalWorkspaceMenu, workspaceMenu, workspaceModules } from "../features/workspace/components/navigation.ts";
import { hasPermission } from "../lib/permissions.ts";

test("account and administration remain global and retain their role permissions", () => {
  const moduleLinks = workspaceModules.flatMap((module) => module.items.map((item) => item.href));
  const globalLinks = globalWorkspaceMenu.map((item) => item.href);
  for (const path of ["/profile", "/admin/users", "/admin/audit"]) {
    assert.ok(globalLinks.includes(path));
    assert.ok(!moduleLinks.includes(path));
    assert.ok(workspaceMenu.some((item) => item.href === path));
  }
  for (const path of ["/surgery/dashboard", "/surgery/operations", "/surgery/reports"]) assert.ok(moduleLinks.includes(path));
  assert.deepEqual(globalWorkspaceMenu.filter((item) => hasPermission("USER", item.permission)).map((item) => item.href), ["/profile"]);
  assert.deepEqual(globalWorkspaceMenu.filter((item) => hasPermission("ADMIN", item.permission)).map((item) => item.href), ["/profile", "/admin/users"]);
  assert.deepEqual(globalWorkspaceMenu.filter((item) => hasPermission("SUPERADMIN", item.permission)).map((item) => item.href), globalLinks);
});
