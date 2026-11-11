import { z } from "zod";
import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { writeAudit } from "@/lib/audit/write";
import { prisma } from "@/lib/prisma";
import { hasTrustedRequestOrigin } from "@/lib/security/request-origin";

const headers = { "Cache-Control": "private, no-store" };
const thresholdSchema = z.object({
  systolicMin: z.number().int().min(30).max(300).nullable().optional(), systolicMax: z.number().int().min(30).max(300).nullable().optional(),
  diastolicMin: z.number().int().min(10).max(200).nullable().optional(), diastolicMax: z.number().int().min(10).max(200).nullable().optional(),
  heartRateMin: z.number().int().min(1).max(300).nullable().optional(), heartRateMax: z.number().int().min(1).max(300).nullable().optional(),
  respiratoryMin: z.number().int().min(1).max(100).nullable().optional(), respiratoryMax: z.number().int().min(1).max(100).nullable().optional(),
  oxygenSaturationMin: z.number().int().min(0).max(100).nullable().optional(),
  temperatureMin: z.number().min(25).max(45).nullable().optional(), temperatureMax: z.number().min(25).max(45).nullable().optional(),
  painScoreMax: z.number().int().min(0).max(10).nullable().optional(), aldreteScoreMin: z.number().int().min(0).max(10).nullable().optional(),
}).strict().refine((value) => !value.systolicMin || !value.systolicMax || value.systolicMin < value.systolicMax, { message: "ช่วงความดันตัวบนไม่ถูกต้อง" }).refine((value) => !value.heartRateMin || !value.heartRateMax || value.heartRateMin < value.heartRateMax, { message: "ช่วงชีพจรไม่ถูกต้อง" }).refine((value) => !value.respiratoryMin || !value.respiratoryMax || value.respiratoryMin < value.respiratoryMax, { message: "ช่วงอัตราหายใจไม่ถูกต้อง" }).refine((value) => value.temperatureMin == null || value.temperatureMax == null || value.temperatureMin < value.temperatureMax, { message: "ช่วงอุณหภูมิไม่ถูกต้อง" });
const templateSchema = z.object({ name: z.string().trim().min(1).max(191), scopeType: z.enum(["DEFAULT", "IMPLANT"]), scopeKey: z.string().trim().max(191).default("ALL"), rounds: z.array(z.object({ roundNumber: z.number().int().min(1).max(20), dayOffset: z.number().int().min(1).max(365), label: z.string().trim().min(1).max(191) })).min(1).max(20) }).strict().refine((value) => value.rounds.every((round, index) => index === 0 || value.rounds[index - 1]!.dayOffset < round.dayOffset), { message: "วันติดตามต้องเรียงจากน้อยไปมาก" });
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("thresholds"), thresholds: thresholdSchema }),
  z.object({ action: z.literal("template"), template: templateSchema }),
  z.object({ action: z.literal("lead"), userId: z.string().min(1).max(191), enabled: z.boolean() }),
]);

export async function GET() {
  const user = await getAuthorizedUser("postop:configure");
  if (!user) { await recordDenied("POSTOP_READ"); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  const [thresholds, templates, nurses] = await Promise.all([
    prisma.postoperativeVitalThreshold.findUnique({ where: { id: "global" } }),
    prisma.postoperativeSsiTemplate.findMany({ where: { isActive: true, scopeType: { in: ["DEFAULT", "IMPLANT"] } }, include: { rounds: { where: { isActive: true }, orderBy: { dayOffset: "asc" } } }, orderBy: [{ scopeType: "asc" }, { name: "asc" }] }),
    user.role === "SUPERADMIN" ? prisma.user.findMany({ where: { role: "NURSE", isActive: true, deletedAt: null }, select: { id: true, name: true, isPostopLead: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);
  await writeAudit(prisma, { actorId: user.id, event: "POSTOP_READ", outcome: "SUCCESS", metadata: { module: "POSTOP", section: "SSI" } });
  return Response.json({ thresholds, templates, nurses, isSuperadmin: user.role === "SUPERADMIN" }, { headers });
}

export async function POST(request: Request) {
  const user = await getAuthorizedUser("postop:configure");
  if (!user || !hasTrustedRequestOrigin(request)) { await recordDenied("POSTOP_SETTINGS_UPDATED", user?.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const parsed = input.safeParse(body);
  if (!parsed.success) return Response.json({ error: "ตรวจสอบข้อมูลที่กรอก" }, { status: 400, headers });
  const data = parsed.data;
  try {
    if (data.action === "lead") {
      if (user.role !== "SUPERADMIN") return Response.json({ error: "Forbidden" }, { status: 403, headers });
      const target = await prisma.user.findUnique({ where: { id: data.userId }, select: { id: true, role: true, isActive: true, deletedAt: true } });
      if (!target || target.role !== "NURSE" || !target.isActive || target.deletedAt) return Response.json({ error: "เลือกบัญชี Nurse ที่เปิดใช้งาน" }, { status: 400, headers });
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: target.id }, data: { isPostopLead: data.enabled } });
        await writeAudit(tx, { actorId: user.id, event: "POSTOP_LEAD_ASSIGNED", outcome: "SUCCESS", targetType: "USER", targetId: target.id, metadata: { module: "POSTOP", leadAssigned: data.enabled } });
      });
    } else if (data.action === "thresholds") {
      await prisma.$transaction(async (tx) => {
        await tx.postoperativeVitalThreshold.upsert({ where: { id: "global" }, create: { id: "global", ...data.thresholds, updatedById: user.id }, update: { ...data.thresholds, updatedById: user.id } });
        await writeAudit(tx, { actorId: user.id, event: "POSTOP_SETTINGS_UPDATED", outcome: "SUCCESS", metadata: { module: "POSTOP", section: "OBSERVATION", vitalThresholdsChanged: true } });
      });
    } else {
      const template = data.template;
      const scopeKey = "ALL";
      await prisma.$transaction(async (tx) => {
        const saved = await tx.postoperativeSsiTemplate.upsert({ where: { scopeType_scopeKey: { scopeType: template.scopeType, scopeKey } }, create: { name: template.name, scopeType: template.scopeType, scopeKey, createdById: user.id, updatedById: user.id }, update: { name: template.name, isActive: true, updatedById: user.id } });
        await tx.postoperativeSsiTemplateRound.updateMany({ where: { templateId: saved.id }, data: { isActive: false } });
        for (const round of template.rounds) await tx.postoperativeSsiTemplateRound.upsert({ where: { templateId_roundNumber: { templateId: saved.id, roundNumber: round.roundNumber } }, create: { templateId: saved.id, ...round, isActive: true }, update: { dayOffset: round.dayOffset, label: round.label, isActive: true } });
        await writeAudit(tx, { actorId: user.id, event: "POSTOP_SSI_TEMPLATE_UPDATED", outcome: "SUCCESS", metadata: { module: "POSTOP", section: "SSI", ssiTemplateChanged: true, total: template.rounds.length } });
      });
    }
  } catch {
    return Response.json({ error: "บันทึกการตั้งค่าไม่สำเร็จ" }, { status: 409, headers });
  }
  return Response.json({ ok: true }, { headers });
}
