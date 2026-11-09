import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultColumnVisibility, getRegisterColumns, registerPageSizes, defaultRegisterPageSize } from "../features/operations/lib/register-columns.ts";
import { registerTime } from "../features/operations/lib/register-time.ts";

test("daily and monthly tables share the agreed default order and a hidden source identifier", () => {
  const defaults = defaultColumnVisibility();
  const monthly = getRegisterColumns(false);
  const daily = getRegisterColumns(true);
  const core = ["actions", "number", "hn", "patient", "age", "ward", "operationDate", "startTime", "endTime", "room", "urgency"];
  assert.deepEqual(monthly.filter((column) => defaults[column.id]).map((column) => column.id), core);
  assert.deepEqual(daily.filter((column) => defaults[column.id] && column.id !== "department").map((column) => column.id), core);
  assert.equal(daily.findIndex((column) => column.id === "department") + 1, daily.findIndex((column) => column.id === "room"));
  assert.equal(defaults.operationId, false);
  defaults.operationId = true;
  for (const columns of [monthly, daily]) {
    const visible = columns.filter((column) => defaults[column.id]);
    assert.equal(visible[visible.findIndex((column) => column.id === "number") + 1].id, "operationId");
    assert.equal(columns[0].id, "actions");
  }
  assert.equal(defaultColumnVisibility().operationId, false, "reset returns a fresh set of defaults");
  assert.deepEqual(registerPageSizes, [10, 20, 50]);
  assert.equal(defaultRegisterPageSize, 10);
});

test("operation clocks use Bangkok time for both source datetimes and UTC overrides", () => {
  assert.equal(registerTime("2026-11-07 09:30:00"), "09:30");
  assert.equal(registerTime("2026-11-07T02:30:00.000Z"), "09:30");
  assert.equal(registerTime("2026-11-07T09:30:00+07:00"), "09:30");
  assert.equal(registerTime("2026-11-07T17:30:00Z"), "00:30");
  assert.match(registerTime("2026-11-07T17:30:00Z", true), /8.*2569.*00:30/);
  assert.equal(registerTime(null), "—");
  assert.equal(registerTime("invalid"), "—");
});
