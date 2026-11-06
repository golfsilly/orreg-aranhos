import { test } from "node:test";
import assert from "node:assert/strict";
import { personnelGroupForPosition } from "../lib/hosxp/positions.ts";

test("maps HOSxP position IDs to the five hospital personnel groups", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map(personnelGroupForPosition), [1, 3, 4, 5, 2, 5, 5, 5]);
});

test("keeps unexpected positions ungrouped", () => {
  assert.equal(personnelGroupForPosition(9), null);
  assert.equal(personnelGroupForPosition(0), null);
});
