import { getAuthorizedUser } from "@/lib/authorization";
import { getHosxpOperationTeam } from "@/lib/hosxp/operations";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit/write";
import { recordDenied } from "@/lib/audit/denied";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ operationId: string }> }) {
  const user = await getAuthorizedUser("register:read");
  if (!user) {
    await recordDenied("HOSXP_TEAM_READ");
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }
  const { operationId } = await params;
  if (!/^[1-9]\d*$/.test(operationId) || !Number.isSafeInteger(Number(operationId))) {
    return Response.json({ error: "Invalid operation ID" }, { status: 400, headers });
  }
  try {
    const register = await prisma.surgeryRegister.findUnique({
      where: { hosxpOperationId: operationId },
      select: { staff: { select: { id: true, positionId: true, positionName: true, personnelGroup: true, staffName: true, hosxpStaffCode: true, operationItemName: true, enteredDate: true, enteredTime: true, exitedDate: true, exitedTime: true } } },
    });
    const team = register?.staff.length ? register.staff.map((member) => ({
      teamRowId: `or-reg:${member.id}`,
      doctor: member.hosxpStaffCode,
      doctor_name: member.staffName,
      position_id: member.positionId,
      position_name: member.positionName,
      personnelGroup: member.personnelGroup,
      operation_item_name: member.operationItemName,
      enteredDate: member.enteredDate,
      enteredTime: member.enteredTime,
      exitedDate: member.exitedDate,
      exitedTime: member.exitedTime,
    })) : (await getHosxpOperationTeam(Number(operationId))).map((member) => ({
      teamRowId: member.operation_team_id == null ? null : `hosxp:${String(member.operation_team_id)}`,
      operation_detail_id: member.operation_detail_id ?? null,
      doctor: member.doctor ?? null,
      doctor_name: member.doctor_name ?? null,
      position_id: member.position_id ?? null,
      position_name: member.position_name ?? null,
      personnelGroup: member.personnelGroup ?? null,
      operation_item_name: member.operation_item_name ?? null,
      enteredDate: member.teamEnteredDate,
      enteredTime: member.teamEnteredTime,
      exitedDate: member.teamExitedDate,
      exitedTime: member.teamExitedTime,
    }));
    await writeAudit(prisma, { actorId: user.id, event: "HOSXP_TEAM_READ", outcome: "SUCCESS", targetType: "HOSXP_OPERATION", targetId: operationId, metadata: { total: team.length } });
    return new Response(JSON.stringify({ team }, (_, value) => typeof value === "bigint" ? value.toString() : value), {
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
    });
  } catch {
    await writeAudit(prisma, { actorId: user.id, event: "HOSXP_TEAM_READ", outcome: "FAILURE", targetType: "HOSXP_OPERATION", targetId: operationId });
    return Response.json({ error: "HOSxP is unavailable" }, { status: 503, headers });
  }
}
