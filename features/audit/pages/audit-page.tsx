import { AuditViewer } from "@/features/audit/components/audit-viewer";
import { recordDenied } from "@/lib/audit/denied";
import { auditMetadataSchema, writeAudit } from "@/lib/audit/write";
import { getAuthorizedUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string; beforeId?: string }>;
}) {
  await connection();
  const actor = await getAuthorizedUser("audit:read");
  if (!actor) {
    await recordDenied("AUDIT_LOG_READ");
    redirect("/dashboard");
  }
  const query = await searchParams;
  const cursor = z
    .object({
      before: z.iso.datetime(),
      beforeId: z
        .string()
        .min(1)
        .max(191)
        .regex(/^[a-zA-Z0-9_-]+$/),
    })
    .safeParse(query);
  if ((query.before || query.beforeId) && !cursor.success)
    redirect("/admin/audit");
  const before = cursor.success ? new Date(cursor.data.before) : null;
  await writeAudit(prisma, {
    actorId: actor.id,
    event: "AUDIT_LOG_READ",
    outcome: "SUCCESS",
  });
  const logs = await prisma.auditLog.findMany({
    where:
      before && cursor.success
        ? {
            OR: [
              { occurredAt: { lt: before } },
              { occurredAt: before, id: { lt: cursor.data.beforeId } },
            ],
          }
        : undefined,
    select: {
      id: true,
      occurredAt: true,
      actorId: true,
      event: true,
      outcome: true,
      targetType: true,
      targetId: true,
      metadata: true,
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: 101,
  });
  const displayed = logs.slice(0, 100);
  const actorIds = [
    ...new Set(
      displayed
        .map((log) => log.actorId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const users = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true },
  });
  const names = new Map(users.map((user) => [user.id, user.name]));
  const last = displayed.at(-1);
  const next =
    logs.length > 100 && last
      ? `/admin/audit?${new URLSearchParams({ before: last.occurredAt.toISOString(), beforeId: last.id })}`
      : null;
  return (
    <AuditViewer
      rows={displayed.map(({ metadata, ...log }) => {
        const parsed = auditMetadataSchema.safeParse(metadata ?? {});
        const safe = parsed.success ? parsed.data : {};
        const details = [
          safe.channel ? `ช่องทาง ${safe.channel}` : null,
          safe.action ? `การดำเนินการ ${safe.action}` : null,
          safe.reason ? `เหตุผล ${safe.reason}` : null,
          safe.previousRole && safe.role
            ? `บทบาท ${safe.previousRole} → ${safe.role}`
            : safe.role
              ? `บทบาท ${safe.role}`
              : null,
          safe.previousActive !== undefined &&
          safe.active !== undefined &&
          safe.previousActive !== safe.active
            ? safe.active
              ? "เปิดใช้งาน"
              : "ระงับบัญชี"
            : null,
          safe.passwordChanged ? "เปลี่ยนรหัสผ่าน" : null,
          safe.providerIdentityChanged ? "เปลี่ยนข้อมูล Provider ID" : null,
          safe.usernameChanged ? "เปลี่ยนชื่อผู้ใช้" : null,
          safe.emailChanged ? "เปลี่ยนอีเมล" : null,
          safe.nameChanged ? "เปลี่ยนชื่อ" : null,
          safe.workDetailsChanged ? "เปลี่ยนข้อมูลหน่วยงานหรือตำแหน่ง" : null,
          safe.total !== undefined ? `จำนวน ${safe.total}` : null,
          safe.created !== undefined ? `เพิ่ม ${safe.created}` : null,
          safe.renumbered !== undefined
            ? `ออกเลขใหม่ ${safe.renumbered}`
            : null,
          safe.date ? `วันที่ ${safe.date}` : null,
          safe.fiscalYear ? `ปีงบประมาณ ${safe.fiscalYear}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return {
          ...log,
          occurredAt: log.occurredAt.toISOString(),
          actorName: log.actorId
            ? (names.get(log.actorId) ?? "บัญชีที่ไม่มีอยู่แล้ว")
            : "ไม่ระบุตัวตน",
          details,
        };
      })}
      next={next}
    />
  );
}
