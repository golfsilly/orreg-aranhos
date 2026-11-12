import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { writeAudit } from "@/lib/audit/write";
import { dayRange } from "@/lib/hosxp/date-range";
import { normalizeOperationId } from "@/lib/hosxp/operation-id";
import { getHosxpOperationAnesthesia, getHosxpOperationItems } from "@/lib/hosxp/operations";
import { prisma } from "@/lib/prisma";
import { getSingleDailyRegisterRow } from "@/lib/register/daily-export-data";
import { createSingleRegisterPdf } from "@/lib/register/single-register-pdf";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
type PdfFailureStage = "HOSXP_SOURCE" | "APP_REGISTER" | "HOSXP_TEAM" | "HOSXP_OPERATIONS" | "HOSXP_ANESTHESIA" | "PDF_RENDER" | "AUDIT";
type Context = { params: Promise<{ operationId: string }> };

export async function GET(request: Request, { params }: Context) {
  const user = await getAuthorizedUser("register:read");
  if (!user) {
    await recordDenied("REGISTER_SINGLE_PDF_EXPORTED");
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }

  let operationId: string;
  let day: string;
  try {
    operationId = normalizeOperationId((await params).operationId);
    if (!Number.isSafeInteger(Number(operationId))) throw new Error("Invalid operation ID");
    day = new URL(request.url).searchParams.get("date") ?? "";
    dayRange(day);
  } catch {
    await writeAudit(prisma, { actorId: user.id, event: "REGISTER_SINGLE_PDF_EXPORTED", outcome: "FAILURE", metadata: { reason: "INVALID_INPUT" } });
    return Response.json({ error: "Invalid operation or date" }, { status: 400, headers });
  }

  const register = await prisma.surgeryRegister.findUnique({
    where: { hosxpOperationId: operationId },
    select: { id: true },
  });
  if (!register) {
    await writeAudit(prisma, { actorId: user.id, event: "REGISTER_SINGLE_PDF_EXPORTED", outcome: "FAILURE", metadata: { reason: "NOT_FOUND" } });
    return Response.json({ error: "Register not found" }, { status: 404, headers });
  }

  let stage: PdfFailureStage = "HOSXP_SOURCE";
  try {
    // Keep HOSxP reads sequential. Each helper opens a read-only transaction and
    // the hospital database may have a small connection limit.
    const row = await getSingleDailyRegisterRow(day, operationId, (readStage) => { stage = readStage; });
    if (!row || row.registerNumber === "—") {
      await writeAudit(prisma, { actorId: user.id, event: "REGISTER_SINGLE_PDF_EXPORTED", outcome: "FAILURE", targetType: "REGISTER", targetId: register.id, metadata: { reason: "NOT_FOUND" } });
      return Response.json({ error: "Operation not found for the selected date" }, { status: 404, headers });
    }

    stage = "HOSXP_OPERATIONS";
    const operationItems = (await getHosxpOperationItems(Number(operationId))).map((item) => item.operationItemName);
    stage = "HOSXP_ANESTHESIA";
    const anesthesia = await getHosxpOperationAnesthesia(Number(operationId));

    stage = "PDF_RENDER";
    const pdf = await createSingleRegisterPdf(row, operationItems, anesthesia);
    stage = "AUDIT";
    await prisma.$transaction((tx) => writeAudit(tx, {
      actorId: user.id,
      event: "REGISTER_SINGLE_PDF_EXPORTED",
      outcome: "SUCCESS",
      targetType: "REGISTER",
      targetId: register.id,
      metadata: { date: day, total: 1 },
    }));
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="or-reg-register-${operationId}.pdf"`,
      },
    });
  } catch {
    const failedStage = stage as PdfFailureStage;
    try {
      await writeAudit(prisma, {
        actorId: user.id,
        event: "REGISTER_SINGLE_PDF_EXPORTED",
        outcome: "FAILURE",
        targetType: "REGISTER",
        targetId: register.id,
        metadata: { reason: "UNAVAILABLE", stage: failedStage },
      });
    } catch {
      // Preserve the safe failure response if the audit database is also unavailable.
    }
    const error = failedStage === "PDF_RENDER"
      ? "Could not render register PDF"
      : failedStage === "AUDIT"
        ? "Could not record PDF export"
        : failedStage === "APP_REGISTER"
          ? "Could not read OR-Reg register data"
          : failedStage === "HOSXP_TEAM"
            ? "Could not read HOSxP team data"
            : failedStage === "HOSXP_OPERATIONS"
              ? "Could not read HOSxP operation details"
              : failedStage === "HOSXP_ANESTHESIA"
                ? "Could not read HOSxP anesthesia data"
                : "Could not read HOSxP operation data";
    return Response.json({ error, code: failedStage }, { status: 503, headers });
  }
}
