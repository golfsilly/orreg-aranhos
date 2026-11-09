import { test } from "node:test";
import assert from "node:assert/strict";
import { operationsForDaySql } from "../lib/hosxp/operation-query.ts";

test("projects register fields and aggregates one-to-many operation details by operation ID", () => {
  assert.match(operationsForDaySql, /o\.age_text/);
  assert.match(operationsForDaySql, /o\.room_id/);
  assert.match(operationsForDaySql, /MIN\(begin_datetime\) AS operation_started_at/);
  assert.match(operationsForDaySql, /MAX\(end_datetime\) AS operation_ended_at/);
  assert.match(operationsForDaySql, /GROUP_CONCAT\(DISTINCT NULLIF\(TRIM\(od\.diagnosis_text\)/);
  assert.match(operationsForDaySql, /GROUP BY od\.operation_id/);
  assert.match(operationsForDaySql, /od\.operation_id = o\.operation_id/);
  assert.match(operationsForDaySql, /o\.request_operation_date >= \? AND o\.request_operation_date < \?/);
  assert.doesNotMatch(operationsForDaySql, /LEFT JOIN operation_screen_in/);
  assert.match(operationsForDaySql, /ORDER BY o\.request_operation_date ASC, o\.operation_id DESC\s*$/);
});
