import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bangkokDateTime,
  calendarMonths,
  occupancyOnDate,
  occupancyInterval,
  operationCalendarDate,
  operationOccursOnDate,
  overlappingOperationIds,
  shiftDate,
  visibleCalendarDays,
} from "../features/operations/lib/calendar.ts";

test("calendar uses Bangkok dates for stored UTC timestamps and keeps overnight occupancy", () => {
  const operation = {
    operation_id: 11,
    request_operation_date: "2026-11-30",
    roomEnteredAt: "2026-11-30T16:30:00.000Z",
    roomExitedAt: "2026-11-30T17:45:00.000Z",
  };
  assert.deepEqual(bangkokDateTime(operation.roomEnteredAt), {
    date: "2026-11-30", hour: 23, minute: 30, timestamp: Date.parse(operation.roomEnteredAt),
  });
  assert.equal(operationCalendarDate(operation), "2026-11-30");
  assert.deepEqual([occupancyInterval(operation).start.hour, occupancyInterval(operation).end.date, occupancyInterval(operation).end.hour], [23, "2026-12-01", 0]);
  assert.equal(operationOccursOnDate(operation, "2026-12-01"), true);
  assert.deepEqual(occupancyOnDate(operation, "2026-12-01"), {
    interval: occupancyInterval(operation), startMinute: 0, endMinute: 45,
    continuesFromPreviousDay: true, continuesIntoNextDay: false,
  });
});

test("missing room times are unscheduled and cannot create false overlaps", () => {
  const noTime = { operation_id: 1, request_operation_date: "2026-11-08", roomEnteredAt: null, roomExitedAt: null };
  assert.equal(occupancyInterval(noTime), null);
  assert.equal(operationCalendarDate(noTime), "2026-11-08");
  assert.deepEqual([...overlappingOperationIds([noTime])], []);
});

test("overlaps are detected only within the same room", () => {
  const operations = [
    { operation_id: 1, sourceRoomId: "OR1", roomEnteredAt: "2026-11-08T01:00:00.000Z", roomExitedAt: "2026-11-08T03:00:00.000Z" },
    { operation_id: 2, sourceRoomId: "OR1", roomEnteredAt: "2026-11-08T02:00:00.000Z", roomExitedAt: "2026-11-08T04:00:00.000Z" },
    { operation_id: 3, sourceRoomId: "OR2", roomEnteredAt: "2026-11-08T02:00:00.000Z", roomExitedAt: "2026-11-08T04:00:00.000Z" },
  ];
  assert.deepEqual([...overlappingOperationIds(operations)].sort(), ["1", "2"]);
});

test("week navigation crosses month boundaries and month view includes each date once", () => {
  assert.equal(shiftDate("2026-11-30", 1), "2026-12-01");
  assert.deepEqual(calendarMonths("2026-11-01", "week"), ["2026-10", "2026-11"]);
  assert.deepEqual(calendarMonths("2026-12-01", "day"), ["2026-12", "2026-11"]);
  const days = visibleCalendarDays("2026-02-12", "month");
  assert.equal(days.length, 28);
  assert.equal(new Set(days).size, 28);
  assert.equal(days[0], "2026-02-01");
  assert.equal(days.at(-1), "2026-02-28");
});
