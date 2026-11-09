import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { writeAudit } from "@/lib/audit/write";
import { dayRange } from "@/lib/hosxp/date-range";
import { prisma } from "@/lib/prisma";
import { getDailyRegisterRows } from "@/lib/register/daily-export-data";
import { createDailyRegisterXlsx } from "@/lib/register/daily-xlsx";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  const user = await getAuthorizedUser("register:read");
  if (!user) {
    await recordDenied("REGISTER_DAILY_EXCEL_EXPORTED");
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }
  const day = new URL(request.url).searchParams.get("date") ?? "";
  try { dayRange(day); } catch { return Response.json({ error: "Invalid date" }, { status: 400, headers }); }
  try {
    const rows = await getDailyRegisterRows(day);
    const workbook = createDailyRegisterXlsx(rows);
    await prisma.$transaction((tx) => writeAudit(tx, { actorId: user.id, event: "REGISTER_DAILY_EXCEL_EXPORTED", outcome: "SUCCESS", targetType: "HOSXP_DAY", targetId: day, metadata: { date: day, total: rows.length } }));
    return new Response(new Uint8Array(workbook), { headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="or-reg-register-${day}.xlsx"` } });
  } catch {
    await writeAudit(prisma, { actorId: user.id, event: "REGISTER_DAILY_EXCEL_EXPORTED", outcome: "FAILURE", targetType: "HOSXP_DAY", targetId: day, metadata: { date: day } });
    return Response.json({ error: "Could not create daily register Excel file" }, { status: 503, headers });
  }
}
