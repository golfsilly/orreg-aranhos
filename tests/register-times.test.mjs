import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRegisterTimes } from "../lib/register/times.ts";

test("parses Bangkok local times, including surgery crossing midnight", () => {
  const result = parseRegisterTimes({ roomEnteredAt: "2026-11-30T23:30", operationStartedAt: "2026-11-30T23:45", operationEndedAt: "2026-12-01T00:30", roomExitedAt: "2026-12-01T00:45" });
  assert.equal(result.roomEnteredAt.toISOString(), "2026-11-30T16:30:00.000Z");
  assert.equal(result.operationEndedAt.toISOString(), "2026-11-30T17:30:00.000Z");
});

test("rejects invalid and out-of-order times, while allowing blanks", () => {
  const empty = { roomEnteredAt: "", operationStartedAt: "", operationEndedAt: "", roomExitedAt: "" };
  assert.equal(parseRegisterTimes(empty).roomEnteredAt, null);
  assert.throws(() => parseRegisterTimes({ ...empty, roomEnteredAt: "2026-02-30T12:00" }));
  assert.throws(() => parseRegisterTimes({ ...empty, operationStartedAt: "2026-12-01T12:00", operationEndedAt: "2026-12-01T11:59" }));
  assert.throws(() => parseRegisterTimes({ roomEnteredAt: "" }));
});
