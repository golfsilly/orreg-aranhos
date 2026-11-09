import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { operationTeamRows } from "../features/operations/lib/operation-team-rows.ts";
import { groupOperationTeam } from "../features/operations/lib/operation-team-groups.ts";

const require = createRequire(import.meta.url);
function load(file, dependencies) {
  const compiled = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "exports", "module", compiled)((id) => {
    if (id === "react/jsx-runtime") return require(id);
    if (!(id in dependencies)) throw new Error(`Unexpected dependency: ${id}`);
    return dependencies[id];
  }, loaded.exports, loaded);
  return loaded.exports;
}

const assignments = [
  { position_id: 1, doctor: "DEMO-01", operation_item_name: "DEMO PROCEDURE A" },
  { position_id: 1, doctor: "DEMO-01", operation_item_name: "DEMO PROCEDURE B" },
  { position_id: 1, doctor: "DEMO-01", operation_item_name: "DEMO PROCEDURE A" },
];

test("mobile and desktop team rows keep repeated staff and exact duplicates with unique keys", () => {
  const { OperationTeamAssignments } = load("../features/operations/components/shared/operation-team-assignments.tsx", {
    "@/components/ui/responsive-scroll": { ResponsiveScroll: () => null },
    "./thai-date-picker": { formatThaiDateValue: (value) => value },
    "../../lib/operation-team-rows": { operationTeamRows },
  });
  const tree = OperationTeamAssignments({ team: assignments });
  const keysByView = [];
  function visit(element) {
    if (!element || typeof element !== "object") return;
    const children = element.props?.children;
    if (Array.isArray(children)) {
      if (children.length && children.every((child) => child?.type === "article" || child?.type === "tr")) {
        keysByView.push(children.map((child) => child.key));
      }
      children.forEach(visit);
    } else visit(children);
  }
  visit(tree);
  assert.equal(keysByView.length, 2, "both responsive views are checked");
  for (const keys of keysByView) {
    assert.equal(keys.length, assignments.length);
    assert.equal(new Set(keys).size, assignments.length);
  }
});

test("saved row IDs stay stable when rows move or attendance changes; legacy identities do not collide", () => {
  const team = assignments.map((member, index) => ({ ...member, teamRowId: `or-reg:DEMO-${index}` }));
  const before = operationTeamRows(team);
  const reordered = operationTeamRows([...team].reverse().map((member) => ({ ...member, enteredTime: "11:00:00" })));
  assert.deepEqual(reordered.map((row) => row.key), before.map((row) => row.key).reverse());
  const legacy = [{ position_id: "a-b", doctor: "c" }, { position_id: "a", doctor: "b-c" }, {}, {}];
  assert.equal(new Set(operationTeamRows(legacy).map((row) => row.key)).size, legacy.length);
  assert.deepEqual(operationTeamRows([]), []);
});

test("the five team groups follow HOSxP positions, retaining every repeated assignment", () => {
  const team = [8, 2, 1, 7, 5, 4, 3, 6].map((position_id) => ({ position_id, doctor: "DEMO-SAME-STAFF" }));
  team.push({ position_id: 1, doctor: "DEMO-SAME-STAFF" });
  const { groups, ungrouped } = groupOperationTeam(team);
  assert.deepEqual(groups.map((group) => group.id), [1, 2, 3, 4, 5]);
  assert.deepEqual(groups.map((group) => group.members.map((member) => member.position_id)), [[1, 1], [5], [2], [3], [8, 7, 4, 6]]);
  assert.equal(groups.reduce((sum, group) => sum + group.members.length, 0), team.length);
  assert.equal(ungrouped.length, 0);
});

test("legacy group metadata is supported; unmatched positions and empty groups remain visible", () => {
  const team = [{ personnelGroup: "2" }, { position_id: "5", personnelGroup: 1 }, { position_id: 99 }, {}];
  const { groups, ungrouped } = groupOperationTeam(team);
  assert.deepEqual(groups[1].members, [team[0], team[1]], "known position IDs take precedence over stale group metadata");
  assert.deepEqual(ungrouped, team.slice(2));
  assert.equal(groupOperationTeam([]).groups.length, 5);
  assert.ok(groupOperationTeam([]).groups.every((group) => group.members.length === 0));
});

for (const source of ["saved", "hosxp"]) test(`team API preserves ${source} row identity and the read audit`, async () => {
  const audits = [];
  const staff = assignments.map((member, index) => ({ id: `DEMO-${index}`, positionId: member.position_id, hosxpStaffCode: member.doctor, operationItemName: member.operation_item_name }));
  const { GET } = load("../app/api/hosxp/operations/[operationId]/team/route.ts", {
    "@/lib/authorization": { getAuthorizedUser: async () => ({ id: "DEMO-ACTOR" }) },
    "@/lib/hosxp/operations": { getHosxpOperationTeam: async () => assignments.map((member, index) => ({ ...member, operation_team_id: BigInt(index + 1), operation_detail_id: 10 + index })) },
    "@/lib/prisma": { prisma: { surgeryRegister: { findUnique: async (query) => {
      assert.equal(query.select.staff.select.id, true);
      return source === "saved" ? { staff } : null;
    } } } },
    "@/lib/audit/write": { writeAudit: async (_, entry) => audits.push(entry) },
    "@/lib/audit/denied": { recordDenied: async () => { throw new Error("Unexpected denial"); } },
  });
  const response = await GET(new Request("http://localhost/api/hosxp/operations/1/team"), { params: Promise.resolve({ operationId: "1" }) });
  assert.equal(response.status, 200);
  const { team } = await response.json();
  assert.equal(team.length, assignments.length);
  assert.equal(new Set(team.map((member) => member.teamRowId)).size, team.length);
  assert.ok(team.every((member) => member.teamRowId.startsWith(source === "saved" ? "or-reg:" : "hosxp:")));
  if (source === "hosxp") assert.deepEqual(team.map((member) => member.operation_detail_id), [10, 11, 12]);
  assert.equal(audits.length, 1); assert.equal(audits[0].event, "HOSXP_TEAM_READ");
  assert.doesNotMatch(JSON.stringify(audits), /DEMO-01|DEMO PROCEDURE/);
});
