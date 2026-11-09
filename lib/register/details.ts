export const anesthesiaOptions = ["LA", "TIVA", "SB", "NB", "LMA", "GA", "GA_WITH_MASK"] as const;
export const urgencyOptions = ["ELECTIVE", "EMERGENCY"] as const;
export const surgeryClassOptions = ["MAJOR", "MINOR"] as const;
export const minorPeriodOptions = ["OFFICIAL_HOURS", "OUTSIDE_HOURS"] as const;
export type Anesthesia = (typeof anesthesiaOptions)[number];
export type Urgency = (typeof urgencyOptions)[number];
export type SurgeryClass = (typeof surgeryClassOptions)[number];
export type MinorPeriod = (typeof minorPeriodOptions)[number];
export type RegisterDetails = { patho: boolean; preOp: boolean; postOp: boolean; anesthesia: Anesthesia | null; urgency: Urgency | null; surgeryClass: SurgeryClass | null; minorPeriod: MinorPeriod | null; diagnosis: string; remark: string };
export const registerDetailsSchema = z.object({
  patho: z.boolean(), preOp: z.boolean(), postOp: z.boolean(),
  anesthesia: z.enum(anesthesiaOptions).nullable(), urgency: z.enum(urgencyOptions).nullable(),
  surgeryClass: z.enum(surgeryClassOptions).nullable(), minorPeriod: z.enum(minorPeriodOptions).nullable(),
  diagnosis: z.string().trim().max(4000), remark: z.string().trim().max(2000),
}).refine((value) => value.surgeryClass === "MINOR" || value.minorPeriod === null, { message: "ช่วงเวลาต้องเป็นการผ่าตัดเล็ก", path: ["minorPeriod"] });

export function urgencyFromHosxp(value: unknown): Urgency | null {
  if (typeof value !== "string") return null;
  const name = value.trim().toUpperCase();
  return urgencyOptions.includes(name as Urgency) ? name as Urgency : null;
}

export function parseRegisterDetails(input: unknown): RegisterDetails {
  return registerDetailsSchema.parse(input);
}
import { z } from "zod";
