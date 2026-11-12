import { test } from "node:test";
import assert from "node:assert/strict";
import { assertSetOrResponse, SetOrNotificationError } from "../lib/notifications/set-or-response.ts";

test("accepts legacy and current success envelopes", () => {
  for (const body of [{ message_code: 200, message: "Success" }, { status: 200, message: "Success" }, { status: "200" }])
    assert.doesNotThrow(() => assertSetOrResponse(body, 200));
});

test("HTTP 200 cannot hide an application rejection", () => {
  for (const body of [{ status: 400, message: "messages must be a non-empty array" }, { message_code: 401, message: "Unauthorized" }, { status: 500 }])
    assert.throws(() => assertSetOrResponse(body, 200), (e) => e instanceof SetOrNotificationError && e.httpStatus === 200 && e.responseCode >= 400);
});

test("unknown, malformed and conflicting envelopes cannot acknowledge delivery", () => {
  for (const body of [null, [], {}, { message: "Success" }, { status: true }, { status: "success" }, { status: 200, message_code: 401 }, { message_code: 200, status: null }])
    assert.throws(() => assertSetOrResponse(body, 200), (e) => e.code === "MOPH_INVALID_RESPONSE");
});

test("HTTP rejection wins over a success body and errors do not expose response text", () => {
  assert.throws(() => assertSetOrResponse({ status: 200 }, 503), (e) => e.code === "HTTP_SERVER_ERROR" && e.httpStatus === 503);
  assert.throws(() => assertSetOrResponse({ status: 401, message: "private-response" }, 200), (e) => !e.message.includes("private-response"));
});
