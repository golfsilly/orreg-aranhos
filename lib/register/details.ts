export const anesthesiaOptions = ["LA", "TIVA", "SB", "NB", "LMA", "GA", "GA_WITH_MASK"] as const;
export const urgencyOptions = ["ELECTIVE", "EMERGENCY"] as const;
export const surgeryClassOptions = ["MAJOR", "MINOR"] as const;
export const minorPeriodOptions = ["OFFICIAL_HOURS", "OUTSIDE_HOURS"] as const;
export type Anesthesia = (typeof anesthesiaOptions)[number];
export type Urgency = (typeof urgencyOptions)[number];
export type SurgeryClass = (typeof surgeryClassOptions)[number];
export type MinorPeriod = (typeof minorPeriodOptions)[number];
export type RegisterDetails = { patho: boolean; preOp: boolean; postOp: boolean; anesthesia: Anesthesia | null; urgency: Urgency | null; surgeryClass: SurgeryClass | null; minorPeriod: MinorPeriod | null };

export function urgencyFromHosxp(value: unknown): Urgency | null {
  if (typeof value !== "string") return null;
  const name = value.trim().toUpperCase();
  return urgencyOptions.includes(name as Urgency) ? name as Urgency : null;
}

export function parseRegisterDetails(input: unknown): RegisterDetails {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid details");
  const value = input as Record<string, unknown>;
  if (typeof value.patho !== "boolean" || typeof value.preOp !== "boolean" || typeof value.postOp !== "boolean") throw new Error("Invalid checkboxes");
  if (value.anesthesia !== null && (typeof value.anesthesia !== "string" || !anesthesiaOptions.includes(value.anesthesia as Anesthesia))) throw new Error("Invalid anesthesia");
  if (value.urgency !== null && (typeof value.urgency !== "string" || !urgencyOptions.includes(value.urgency as Urgency))) throw new Error("Invalid operation urgency");
  if (value.surgeryClass !== null && (typeof value.surgeryClass !== "string" || !surgeryClassOptions.includes(value.surgeryClass as SurgeryClass))) throw new Error("Invalid surgery class");
  if (value.minorPeriod !== null && (typeof value.minorPeriod !== "string" || !minorPeriodOptions.includes(value.minorPeriod as MinorPeriod))) throw new Error("Invalid minor surgery period");
  if (value.surgeryClass !== "MINOR" && value.minorPeriod !== null) throw new Error("Minor surgery period requires minor surgery");
  return { patho: value.patho, preOp: value.preOp, postOp: value.postOp, anesthesia: value.anesthesia as Anesthesia | null, urgency: value.urgency as Urgency | null, surgeryClass: value.surgeryClass as SurgeryClass | null, minorPeriod: value.minorPeriod as MinorPeriod | null };
}
