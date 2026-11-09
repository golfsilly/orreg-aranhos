import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { writeAudit } from "@/lib/audit/write";
import { monthRange } from "@/lib/hosxp/date-range";
import { prisma } from "@/lib/prisma";
import { getMonthlyRegisterRows } from "@/lib/register/daily-export-data";
import { createMonthlyRegisterPdf } from "@/lib/register/daily-pdf";
import { fiscalPeriod } from "@/lib/register/fiscal-period";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  const user = await getAuthorizedUser("register:read");
  if (!user) {
    await recordDenied("REGISTER_MONTHLY_PDF_EXPORTED");
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }
  const params = new URL(request.url).searchParams;
  const month = params.get("month") ?? "";
  const departmentId = params.get("department") ?? "";
  try { monthRange(month); } catch { return Response.json({ error: "Invalid month" }, { status: 400, headers }); }
  if (departmentId.length > 191) return Response.json({ error: "Invalid department" }, { status: 400, headers });
  try {
    const allRows = await getMonthlyRegisterRows(month);
    const rows = departmentId ? allRows.filter((row) => row.departmentId === departmentId) : allRows;
    const pdf = await createMonthlyRegisterPdf(rows, month);
    const period = fiscalPeriod(`${month}-01`);
    await prisma.$transaction((tx) => writeAudit(tx, { actorId: user.id, event: "REGISTER_MONTHLY_PDF_EXPORTED", outcome: "SUCCESS", targetType: "HOSXP_MONTH", targetId: month, metadata: { calendarMonth: period.calendarMonth, fiscalYear: period.fiscalYear, total: rows.length } }));
    return new Response(new Uint8Array(pdf), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="or-reg-register-${month}.pdf"` } });
  } catch {
    const period = fiscalPeriod(`${month}-01`);
    await writeAudit(prisma, { actorId: user.id, event: "REGISTER_MONTHLY_PDF_EXPORTED", outcome: "FAILURE", targetType: "HOSXP_MONTH", targetId: month, metadata: { calendarMonth: period.calendarMonth, fiscalYear: period.fiscalYear } });
    return Response.json({ error: "Could not create monthly register PDF" }, { status: 503, headers });
  }
}
