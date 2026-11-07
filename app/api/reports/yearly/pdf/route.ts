import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { writeAudit } from "@/lib/audit/write";
import { prisma } from "@/lib/prisma";
import { createYearlyReportPdf } from "@/lib/register/report-pdf";
import { validFiscalYear, yearlyReport } from "@/lib/register/reports";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const user = await getAuthorizedUser("dashboard:read");
  if (!user) {
    await recordDenied("REPORT_PDF_EXPORTED");
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }
  const year = validFiscalYear(new URL(request.url).searchParams.get("year") ?? "");
  if (!year) return Response.json({ error: "Invalid year" }, { status: 400, headers });
  const report = await yearlyReport(year);
  const pdf = await createYearlyReportPdf(report);
  await writeAudit(prisma, { actorId: user.id, event: "REPORT_PDF_EXPORTED", outcome: "SUCCESS", metadata: { fiscalYear: year } });
  return new Response(new Uint8Array(pdf), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="surgery-report-${year}.pdf"`, "X-Content-Type-Options": "nosniff" } });
}
