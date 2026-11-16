import { z } from "zod";

export const monitorQuerySchema = z.object({
  days: z.enum(["1", "3", "7"]).default("7"),
  status: z.enum(["ALL", "SENT", "REVIEW", "CLAIMED"]).default("ALL"),
  q: z.string().trim().max(19).regex(/^\d*$/).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.enum(["10", "20", "50"]).default("10"),
}).strict();
export type MonitorQuery = z.infer<typeof monitorQuerySchema>;

export function parseMonitorQuery(params: URLSearchParams): MonitorQuery {
  if ([...params.keys()].some((key) => params.getAll(key).length > 1)) throw new Error("Duplicate parameter");
  return monitorQuerySchema.parse(Object.fromEntries(params));
}

export function monitorWindow(days: MonitorQuery["days"], now: Date) {
  return { gte: new Date(now.getTime() - Number(days) * 86400000), lte: now };
}

const errors: Record<string, string> = {
  NETWORK_OR_TIMEOUT: "เชื่อมต่อ MOPH ไม่สำเร็จหรือหมดเวลารอผล ต้องตรวจว่าข้อความถึงกลุ่มแล้วหรือยัง",
  HTTP_CLIENT_ERROR: "MOPH ปฏิเสธคำขอส่งข้อความ",
  HTTP_SERVER_ERROR: "บริการ MOPH ขัดข้อง",
  MOPH_UNAUTHORIZED: "MOPH ไม่อนุญาตให้ส่ง กรุณาตรวจคีย์ของกลุ่ม",
  MOPH_INVALID_MESSAGE: "รูปแบบข้อความไม่ผ่านการตรวจของ MOPH",
  MOPH_SEND_ERROR: "MOPH แจ้งว่าส่งข้อความไม่สำเร็จ",
  MOPH_MISSING_MESSAGES: "MOPH ไม่พบรายการข้อความในคำขอ",
  MOPH_REJECTED_401: "MOPH ปฏิเสธการส่งข้อความ",
  MOPH_REJECTED_RESPONSE: "MOPH ตอบกลับว่าคำขอไม่สำเร็จ",
  MOPH_INVALID_RESPONSE: "ยืนยันผลส่งไม่ได้ ต้องตรวจข้อความในกลุ่มก่อนดำเนินการต่อ",
  LEGACY_FAILURE_REVIEW: "พักเพื่อตรวจประวัติส่งจากระบบเดิม",
  DELIVERY_GUARD_REVIEW: "พักเพื่อตรวจรายการเดิมก่อนเปิดระบบกันซ้ำรุ่นใหม่",
  DELIVERY_REVIEW_REQUIRED: "มีรายการที่ยังยืนยันผลส่งไม่ได้",
  SEND_IN_PROGRESS: "กำลังส่งและรอยืนยันผลจาก MOPH",
  HOSXP_UNAVAILABLE: "อ่านข้อมูล HOSxP ไม่สำเร็จ",
  UNEXPECTED_SEND_ERROR: "ยืนยันการส่งหรือบันทึกผลส่งไม่ได้",
  UNKNOWN: "พบข้อผิดพลาด กรุณาตรวจบันทึกระบบ",
};
export function safeMonitorError(code: string | null | undefined) {
  if (!code) return null;
  return Object.hasOwn(errors, code) || /^P\d{4}$/.test(code) ? code : "UNKNOWN";
}
export function monitorErrorLabel(code: string | null) {
  return code ? errors[code] ?? "ฐานข้อมูลแอปมีข้อผิดพลาด กรุณาตรวจการเชื่อมต่อและ migration" : "ไม่มีข้อผิดพลาดที่บันทึกไว้";
}

export type MonitorHealth = "DISABLED" | "UNCONFIGURED" | "WAITING" | "PAUSED" | "SENDING" | "STALE" | "CHECK_FAILED" | "ACTIVE";
export function monitorHealth(input: { enabled: boolean; configured: boolean; cursor: { paused: boolean; lastErrorCode: string | null; lastCheckedAt: Date | null; lastCheckErrorCode: string | null } | null; now: Date }): MonitorHealth {
  if (!input.enabled) return "DISABLED";
  if (!input.configured) return "UNCONFIGURED";
  const c = input.cursor;
  if (!c) return "WAITING";
  const age = c.lastCheckedAt ? input.now.getTime() - c.lastCheckedAt.getTime() : Infinity;
  if (c.paused) return c.lastErrorCode === "SEND_IN_PROGRESS" && age >= 0 && age <= 8 * 60000 ? "SENDING" : "PAUSED";
  if (!c.lastCheckedAt) return "WAITING";
  if (age < -60000 || age > 8 * 60000) return "STALE";
  if (c.lastCheckErrorCode) return "CHECK_FAILED";
  return "ACTIVE";
}

const isoDate = z.iso.datetime().nullable();
export const monitorResponseSchema = z.object({
  generatedAt: z.iso.datetime(), windowStart: z.iso.datetime(), windowEnd: z.iso.datetime(),
  health: z.enum(["DISABLED", "UNCONFIGURED", "WAITING", "PAUSED", "SENDING", "STALE", "CHECK_FAILED", "ACTIVE"]),
  enabled: z.boolean(), configured: z.boolean(), logoConfigured: z.boolean(),
  cursor: z.object({ operationId: z.string(), paused: z.boolean(), lastErrorCode: z.string().nullable(), lastCheckedAt: isoDate, lastCheckErrorCode: z.string().nullable() }).nullable(),
  lastSentAt: isoDate,
  counts: z.object({ total: z.number(), sent: z.number(), review: z.number(), claimed: z.number() }),
  total: z.number(), page: z.number(), pageSize: z.number(), sourceAvailable: z.boolean(),
  rows: z.array(z.object({
    operationId: z.string(), status: z.enum(["SENT", "REVIEW", "CLAIMED", "UNKNOWN"]),
    createdAt: z.iso.datetime(), sentAt: isoDate, errorCode: z.string().nullable(),
    patient: z.object({ name: z.string(), hn: z.string(), operationDate: z.string().nullable() }).nullable(),
  })),
});
export type MonitorResponse = z.infer<typeof monitorResponseSchema>;
export type MonitorRow = MonitorResponse["rows"][number];
