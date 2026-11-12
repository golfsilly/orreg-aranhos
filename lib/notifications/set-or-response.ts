export type SetOrNotificationErrorCode =
  | "NETWORK_OR_TIMEOUT"
  | "HTTP_CLIENT_ERROR"
  | "HTTP_SERVER_ERROR"
  | "MOPH_UNAUTHORIZED"
  | "MOPH_INVALID_MESSAGE"
  | "MOPH_SEND_ERROR"
  | "MOPH_MISSING_MESSAGES"
  | "MOPH_REJECTED_401"
  | "MOPH_REJECTED_RESPONSE"
  | "MOPH_INVALID_RESPONSE"
  | "UNEXPECTED_SEND_ERROR";

export class SetOrNotificationError extends Error {
  readonly code: SetOrNotificationErrorCode;
  readonly httpStatus?: number;
  readonly responseCode?: number;

  constructor(code: SetOrNotificationErrorCode, httpStatus?: number, responseCode?: number) {
    super("MOPH_NOTIFY_FAILED");
    this.name = "SetOrNotificationError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.responseCode = responseCode;
  }
}

function numericCode(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599)
    return value;
  if (typeof value === "string" && /^[1-5]\d{2}$/.test(value)) return Number(value);
  return undefined;
}

/** Accept the documented legacy envelope and the current numeric status envelope. */
export function assertSetOrResponse(result: unknown, httpStatus: number): void {
  if (httpStatus < 200 || httpStatus >= 300) {
    throw new SetOrNotificationError(httpStatus >= 500 ? "HTTP_SERVER_ERROR" : "HTTP_CLIENT_ERROR", httpStatus);
  }
  if (!result || typeof result !== "object" || Array.isArray(result))
    throw new SetOrNotificationError("MOPH_INVALID_RESPONSE", httpStatus);

  const body = result as Record<string, unknown>;
  const legacyCode = numericCode(body.message_code);
  const statusCode = numericCode(body.status);
  // Conflicting or malformed explicit codes must never acknowledge delivery.
  if ((body.message_code !== undefined && legacyCode === undefined)
    || (body.status !== undefined && statusCode === undefined)
    || (legacyCode !== undefined && statusCode !== undefined && legacyCode !== statusCode))
    throw new SetOrNotificationError("MOPH_INVALID_RESPONSE", httpStatus);

  const code = legacyCode ?? statusCode;
  if (code === 200) return;
  const message = body.message;
  const errorCode: SetOrNotificationErrorCode = code === 401
    ? message === "Unauthorized" ? "MOPH_UNAUTHORIZED"
      : message === "messages error" ? "MOPH_INVALID_MESSAGE"
        : message === "Send messages error" ? "MOPH_SEND_ERROR"
          : message === "require messages" ? "MOPH_MISSING_MESSAGES"
            : "MOPH_REJECTED_401"
    : code === 400 && message === "messages must be a non-empty array" ? "MOPH_MISSING_MESSAGES"
      : code !== undefined && code >= 400 ? "MOPH_REJECTED_RESPONSE"
        : "MOPH_INVALID_RESPONSE";
  throw new SetOrNotificationError(errorCode, httpStatus, code);
}
