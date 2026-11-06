import "server-only";
import { prisma } from "@/lib/prisma";
import { anesthesiaOptions, urgencyOptions } from "./details";

export const fiscalMonths = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const monthNames = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

export function validFiscalYear(value: string): number | null {
  if (!/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= 2400 && year <= 2800 ? year : null;
}

export async function yearlyReport(fiscalYear: number) {
  const where = { fiscalYear };
  const [months, anesthesia, urgency, surgeryClasses, patho, preOp, postOp] = await prisma.$transaction(async (tx) => Promise.all([
    tx.surgeryRegister.groupBy({ by: ["calendarMonth"], where, _count: { _all: true } }),
    tx.surgeryRegister.groupBy({ by: ["anesthesia"], where, _count: { _all: true } }),
    tx.surgeryRegister.groupBy({ by: ["urgency"], where, _count: { _all: true } }),
    tx.surgeryRegister.groupBy({ by: ["surgeryClass", "minorPeriod"], where, _count: { _all: true } }),
    tx.surgeryRegister.count({ where: { ...where, patho: true } }),
    tx.surgeryRegister.count({ where: { ...where, preOp: true } }),
    tx.surgeryRegister.count({ where: { ...where, postOp: true } }),
  ]));
  const monthCounts = new Map(months.map((row) => [row.calendarMonth, row._count._all]));
  const anesthesiaCounts = new Map(anesthesia.map((row) => [row.anesthesia, row._count._all]));
  const urgencyCounts = new Map(urgency.map((row) => [row.urgency, row._count._all]));
  return {
    fiscalYear,
    months: fiscalMonths.map((month) => ({ month, name: monthNames[month], count: monthCounts.get(month) ?? 0 })),
    anesthesia: [...anesthesiaOptions.map((name) => ({ name, count: anesthesiaCounts.get(name) ?? 0 })), { name: "ไม่ระบุ", count: anesthesiaCounts.get(null) ?? 0 }],
    urgency: [...urgencyOptions.map((name) => ({ name, count: urgencyCounts.get(name) ?? 0 })), { name: "ไม่ระบุ", count: urgencyCounts.get(null) ?? 0 }],
    surgeryClass: [
      { name: "ผ่าตัดใหญ่", count: surgeryClasses.filter((row) => row.surgeryClass === "MAJOR").reduce((sum, row) => sum + row._count._all, 0) },
      { name: "ผ่าตัดเล็ก", count: surgeryClasses.filter((row) => row.surgeryClass === "MINOR").reduce((sum, row) => sum + row._count._all, 0) },
      { name: "ไม่ระบุ", count: surgeryClasses.filter((row) => row.surgeryClass === null).reduce((sum, row) => sum + row._count._all, 0) },
    ],
    minorPeriod: [
      { name: "ในเวลาราชการ", count: surgeryClasses.filter((row) => row.surgeryClass === "MINOR" && row.minorPeriod === "OFFICIAL_HOURS").reduce((sum, row) => sum + row._count._all, 0) },
      { name: "นอกเวลาราชการ", count: surgeryClasses.filter((row) => row.surgeryClass === "MINOR" && row.minorPeriod === "OUTSIDE_HOURS").reduce((sum, row) => sum + row._count._all, 0) },
      { name: "ไม่ระบุช่วงเวลา", count: surgeryClasses.filter((row) => row.surgeryClass === "MINOR" && row.minorPeriod === null).reduce((sum, row) => sum + row._count._all, 0) },
    ],
    flags: [{ name: "Patho", count: patho }, { name: "Pre-op", count: preOp }, { name: "Post-op", count: postOp }],
    total: months.reduce((sum, row) => sum + row._count._all, 0),
  };
}
