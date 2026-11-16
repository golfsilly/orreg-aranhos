import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { writeAudit } from "@/lib/audit/write";
import { prisma } from "@/lib/prisma";
import { parseMonitorQuery } from "@/lib/notifications/monitor-contract";
import { loadNotificationMonitor } from "@/lib/notifications/monitor-service";

const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
export async function GET(request: Request) {
  const actor = await getAuthorizedUser("audit:read");
  if (!actor || actor.role !== "SUPERADMIN") {
    await recordDenied("NOTIFICATIONS_MONITOR_READ", actor?.id);
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }
  let query;
  try { query = parseMonitorQuery(new URL(request.url).searchParams); }
  catch { return Response.json({ error: "ช่วงเวลาหรือตัวกรองไม่ถูกต้อง ดูย้อนหลังได้สูงสุด 7 วัน" }, { status: 400, headers }); }
  try { return Response.json(await loadNotificationMonitor(query, actor.id), { headers }); }
  catch {
    await writeAudit(prisma, { actorId: actor.id, event: "NOTIFICATIONS_MONITOR_READ", outcome: "FAILURE", metadata: { section: "NOTIFICATION" } }).catch(() => undefined);
    return Response.json({ error: "โหลดสถานะแจ้งเตือนไม่สำเร็จ กรุณาตรวจการเชื่อมต่อฐาน OR-Reg และ migration" }, { status: 503, headers });
  }
}
