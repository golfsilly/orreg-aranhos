import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(file, dependencies, extra = "") {
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", `${code}\n${extra}`)((id) => {
    assert.ok(id in dependencies, `Unexpected dependency ${id}`);
    return dependencies[id];
  }, mod, mod.exports);
  return mod.exports;
}

test("live ordered procedure details keep stable IDs, separate sides and optional missing fields", async () => {
  const calls = [];
  const source = [
    { operation_list_oper_id: 1, operation_name: "MRM", operation_position: " BREAST ", operation_side: "ขวา" },
    { operation_list_oper_id: 2, operation_name: "MRM", operation_position: "BREAST", operation_side: "ซ้าย" },
    { operation_list_oper_id: 3, operation_name: "Another procedure", operation_position: "-", operation_side: null },
  ];
  const before = structuredClone(source);
  const reader = load("../lib/hosxp/operations.ts", {
    "@/lib/env": { env: {} }, mariadb: {}, "server-only": {}, "./date-range": {}, "./operation-query": {}, "./positions": {},
  }, "module.exports.setQuery = (query) => { readOnlyQuery = query; };");
  reader.setQuery(async (sql, params) => { calls.push({ sql, params }); return source; });
  assert.deepEqual(await reader.getHosxpOrderedOperationItems(11), [
    { operationListOperId: 1, operationName: "MRM", operationPosition: "BREAST", operationSide: "ขวา" },
    { operationListOperId: 2, operationName: "MRM", operationPosition: "BREAST", operationSide: "ซ้าย" },
    { operationListOperId: 3, operationName: "Another procedure", operationPosition: null, operationSide: null },
  ]);
  assert.deepEqual(calls[0].params, ["11"]);
  assert.match(calls[0].sql, /^SELECT/);
  assert.match(calls[0].sql, /FROM operation_list_oper/);
  assert.deepEqual(source, before);
  for (const id of [0, -1, NaN, 1.5, Number.MAX_SAFE_INTEGER + 1])
    await assert.rejects(() => reader.getHosxpOrderedOperationItems(id), /Invalid operation ID/);
  assert.equal(calls.length, 1);
});

function api({ authorized = true, fail = false } = {}) {
  const calls = [], audits = [], denied = [];
  const route = load("../app/api/hosxp/operations/[operationId]/items/route.ts", {
    "@/lib/authorization": { getAuthorizedUser: async (permission) => { assert.equal(permission, "register:read"); return authorized ? { id: "DEMO-ACTOR" } : null; } },
    "@/lib/audit/denied": { recordDenied: async (event) => denied.push(event) },
    "@/lib/audit/write": { writeAudit: async (_, entry) => audits.push(entry) },
    "@/lib/prisma": { prisma: {} },
    "@/lib/hosxp/operations": {
      getHosxpOperationItems: async (id) => { calls.push(id); return [{ operationDetailId: 9, operationItemName: "DEMO-PERFORMED" }]; },
      getHosxpOrderedOperationItems: async (id) => { calls.push(id); if (fail) throw new Error("private source error"); return [{ operationListOperId: 1, operationName: "DEMO-ORDER", operationPosition: "DEMO-SITE", operationSide: "ขวา" }]; },
    },
  });
  return { calls, audits, denied, get: (id = "11") => route.GET(new Request("http://localhost/api/hosxp/operations/11/items"), { params: Promise.resolve({ operationId: id }) }) };
}

test("items API preserves pathology detail IDs and returns live ordered site and side without clinical audit content", async () => {
  const fixture = api();
  const response = await fixture.get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const body = await response.json();
  assert.equal(body.operations[0].operationDetailId, 9);
  assert.equal(body.orderedOperations[0].operationPosition, "DEMO-SITE");
  assert.equal(body.orderedOperations[0].operationSide, "ขวา");
  assert.equal(fixture.audits[0].event, "HOSXP_OPERATION_ITEMS_READ");
  assert.deepEqual(fixture.audits[0].metadata, { total: 2 });
  assert.doesNotMatch(JSON.stringify(fixture.audits), /DEMO-SITE|DEMO-ORDER|DEMO-PERFORMED|ขวา/);
});

test("items API refuses unauthorized or invalid requests before source reads and redacts failures", async () => {
  const denied = api({ authorized: false });
  assert.equal((await denied.get()).status, 403);
  assert.deepEqual(denied.calls, []);
  assert.deepEqual(denied.denied, ["HOSXP_OPERATION_ITEMS_READ"]);
  const invalid = api();
  assert.equal((await invalid.get("11 OR 1=1")).status, 400);
  assert.deepEqual(invalid.calls, []);
  const failed = api({ fail: true });
  const response = await failed.get();
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private source error/);
  assert.equal(failed.audits[0].outcome, "FAILURE");
});
