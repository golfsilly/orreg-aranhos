import { z } from "zod";
import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { writeAudit } from "@/lib/audit/write";
import { prisma } from "@/lib/prisma";
import { hasTrustedRequestOrigin } from "@/lib/security/request-origin";

const headers = { "Cache-Control": "private, no-store" };
const input = z.discriminatedUnion("type", [
  z.object({ type: z.literal("instrument"), code: z.string().trim().min(1).max(64), name: z.string().trim().min(1).max(191), category: z.string().trim().min(1).max(64), description: z.string().max(4000).nullable().optional() }),
  z.object({ type: z.literal("set"), code: z.string().trim().min(1).max(64), name: z.string().trim().min(1).max(191), description: z.string().max(4000).nullable().optional(), items: z.array(z.object({ instrumentId: z.string().min(1).max(191), quantity: z.number().int().min(1).max(1000) })).max(100) }),
  z.object({ type: z.literal("implant"), code: z.string().trim().min(1).max(64), name: z.string().trim().min(1).max(191), manufacturer: z.string().max(191).nullable().optional(), model: z.string().max(191).nullable().optional() }),
  z.object({ type: z.literal("set-use"), registerId: z.string().min(1).max(191), setId: z.string().min(1).max(191), quantity: z.number().int().min(1).max(100), status: z.enum(["ISSUED", "RETURNED", "DAMAGED", "MISSING"]), note: z.string().max(4000).nullable().optional() }),
  z.object({ type: z.literal("implant-use"), registerId: z.string().min(1).max(191), implantId: z.string().min(1).max(191), lotNumber: z.string().max(100).nullable().optional(), serialNumber: z.string().max(100).nullable().optional(), quantity: z.number().int().min(1).max(1000), unit: z.string().max(32).nullable().optional(), site: z.string().max(191).nullable().optional(), laterality: z.enum(["LEFT", "RIGHT", "BILATERAL", "NA"]).nullable().optional(), expiresAt: z.coerce.date().nullable().optional(), note: z.string().max(4000).nullable().optional() }),
  z.object({ type: z.literal("count"), registerId: z.string().min(1).max(191), instrumentId: z.string().max(191).nullable().optional(), checkpoint: z.enum(["INITIAL", "CLOSURE", "FINAL", "RELIEF"]), category: z.enum(["INSTRUMENT", "NEEDLE", "SWAB", "OTHER"]), itemLabel: z.string().trim().min(1).max(191), expectedQuantity: z.number().int().min(0).max(10000), countedQuantity: z.number().int().min(0).max(10000), discrepancyNote: z.string().max(4000).nullable().optional(), witnessName: z.string().max(191).nullable().optional() }),
]);

export async function GET() {
  const user = await getAuthorizedUser("equipment:read");
  if (!user) { await recordDenied("EQUIPMENT_READ"); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  const [instruments, sets, implants, registers, recentCounts, recentUses] = await Promise.all([
    prisma.surgicalInstrument.findMany({ where: { isActive: true }, include: { _count: { select: { setItems: true, counts: true } } }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.surgicalInstrumentSet.findMany({ where: { isActive: true }, include: { items: { include: { instrument: { select: { id: true, name: true, code: true, category: true } } } }, _count: { select: { caseUses: true } } }, orderBy: { name: "asc" } }),
    prisma.surgicalImplant.findMany({ where: { isActive: true }, include: { _count: { select: { uses: true } } }, orderBy: { name: "asc" } }),
    prisma.surgeryRegister.findMany({ orderBy: [{ operationDate: "desc" }, { sequence: "desc" }], take: 100, select: { id: true, fiscalYear: true, calendarMonth: true, sequence: true, departmentId: true, operationDate: true, hosxpOperationId: true } }),
    prisma.surgeryInstrumentCount.findMany({ take: 40, orderBy: { countedAt: "desc" }, include: { instrument: { select: { name: true, code: true } }, register: { select: { sequence: true, calendarMonth: true, departmentId: true, operationDate: true } } } }),
    prisma.surgeryInstrumentSetUse.findMany({ take: 40, orderBy: { createdAt: "desc" }, include: { set: { select: { name: true, code: true } }, register: { select: { sequence: true, calendarMonth: true, departmentId: true, operationDate: true } } } }),
  ]);
  await writeAudit(prisma, { actorId: user.id, event: "EQUIPMENT_READ", outcome: "SUCCESS", metadata: { module: "EQUIPMENT", total: instruments.length + sets.length + implants.length } });
  return Response.json({ instruments, sets, implants, registers, recentCounts, recentUses }, { headers });
}

export async function POST(request: Request) {
  const user = await getAuthorizedUser("equipment:write");
  if (!user || !hasTrustedRequestOrigin(request)) { await recordDenied("EQUIPMENT_READ", user?.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const parsed = input.safeParse(body);
  if (!parsed.success) return Response.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400, headers });
  const data = parsed.data;
  let saved: string;
  try { saved = await prisma.$transaction(async (tx) => {
    let id: string;
    let event: "INSTRUMENT_CATALOG_CREATED" | "INSTRUMENT_SET_CREATED" | "IMPLANT_CATALOG_CREATED" | "INSTRUMENT_SET_USE_RECORDED" | "INSTRUMENT_COUNT_RECORDED" | "IMPLANT_USAGE_RECORDED";
    let section: "INSTRUMENT" | "SET" | "IMPLANT" | "COUNT";
    let registerId: string | undefined;
    if (data.type === "instrument") { const item = await tx.surgicalInstrument.create({ data: { code: data.code, name: data.name, category: data.category, description: data.description, createdById: user.id } }); id = item.id; event = "INSTRUMENT_CATALOG_CREATED"; section = "INSTRUMENT"; }
    else if (data.type === "set") { const set = await tx.surgicalInstrumentSet.create({ data: { code: data.code, name: data.name, description: data.description, createdById: user.id, items: { create: data.items } } }); id = set.id; event = "INSTRUMENT_SET_CREATED"; section = "SET"; }
    else if (data.type === "implant") { const implant = await tx.surgicalImplant.create({ data: { code: data.code, name: data.name, manufacturer: data.manufacturer, model: data.model, createdById: user.id } }); id = implant.id; event = "IMPLANT_CATALOG_CREATED"; section = "IMPLANT"; }
    else if (data.type === "set-use") {
      registerId = data.registerId;
      const now = new Date();
      if (data.status === "RETURNED") {
        const issued = await tx.surgeryInstrumentSetUse.findFirst({ where: { registerId, setId: data.setId, status: "ISSUED" }, orderBy: { issuedAt: "desc" }, select: { id: true } });
        if (!issued) throw new Error("SET_NOT_ISSUED");
        const updated = await tx.surgeryInstrumentSetUse.update({ where: { id: issued.id }, data: { status: "RETURNED", returnedAt: now, ...(data.note ? { note: data.note } : {}) } });
        id = updated.id;
      } else {
        const use = await tx.surgeryInstrumentSetUse.create({ data: { registerId, setId: data.setId, quantity: data.quantity, status: data.status, note: data.note, recordedById: user.id, issuedAt: now } });
        id = use.id;
      }
      event = "INSTRUMENT_SET_USE_RECORDED"; section = "SET";
    }
    else if (data.type === "implant-use") { registerId = data.registerId; const use = await tx.surgeryImplantRecord.create({ data: { registerId: data.registerId, implantId: data.implantId, lotNumber: data.lotNumber, serialNumber: data.serialNumber, quantity: data.quantity, unit: data.unit, site: data.site, laterality: data.laterality, expiresAt: data.expiresAt, note: data.note, recordedById: user.id } }); id = use.id; event = "IMPLANT_USAGE_RECORDED"; section = "IMPLANT"; }
    else { registerId = data.registerId; const variance = data.countedQuantity - data.expectedQuantity; const count = await tx.surgeryInstrumentCount.create({ data: { registerId: data.registerId, instrumentId: data.instrumentId, checkpoint: data.checkpoint, category: data.category, itemLabel: data.itemLabel, expectedQuantity: data.expectedQuantity, countedQuantity: data.countedQuantity, variance, discrepancyNote: data.discrepancyNote, countedById: user.id, witnessName: data.witnessName, ...(variance === 0 ? { resolvedAt: new Date() } : {}) } }); id = count.id; event = "INSTRUMENT_COUNT_RECORDED"; section = "COUNT"; }
    await writeAudit(tx, { actorId: user.id, event, outcome: "SUCCESS", ...(registerId ? { targetType: "REGISTER", targetId: registerId } : {}), metadata: { module: "EQUIPMENT", section, actionType: data.type === "set-use" && data.status === "RETURNED" ? "RETURN" : data.type === "set-use" ? "ISSUE" : "RECORD", ...(data.type === "count" ? { hasDiscrepancy: data.countedQuantity !== data.expectedQuantity } : {}) } });
    return id;
  }); } catch {
    return Response.json({ error: "บันทึกไม่ได้ ตรวจสอบรหัสซ้ำ ทะเบียน และสถานะการจ่ายคืน" }, { status: 409, headers });
  }
  return Response.json({ ok: true, id: saved }, { headers });
}
