import { z } from "zod";

const countRow = z.object({ name: z.string(), count: z.number().int().nonnegative() });
const room = z.object({ id: z.string(), name: z.string(), usedMinutes: z.number().nonnegative(), availableMinutes: z.number().nonnegative(), percent: z.number().min(0).max(100) });

export const statisticsResponseSchema = z.object({
  period: z.enum(["DAY", "MONTH", "YEAR"]), value: z.string(),
  generatedAt: z.string(), start: z.string(), end: z.string(),
  totalCases: z.number().int().nonnegative(), sourceCases: z.number().int().nonnegative(),
  doctorCount: z.number().int().nonnegative(),
  series: z.array(z.object({ key: z.string(), label: z.string(), cases: z.number().int().nonnegative() })),
  doctors: z.array(z.object({ id: z.string(), name: z.string(), cases: z.number().int().nonnegative() })),
  departments: z.array(z.object({ id: z.string(), name: z.string(), count: z.number().int().nonnegative() })),
  emergency: z.array(countRow), procedures: z.array(countRow), wards: z.array(countRow), statuses: z.array(countRow),
  postponed: z.number().int().nonnegative(), cancelled: z.number().int().nonnegative(),
  averageDurationMinutes: z.number().nonnegative().nullable(), durationCases: z.number().int().nonnegative(), durationBuckets: z.array(countRow),
  utilization: z.object({ usedMinutes: z.number().nonnegative(), availableMinutes: z.number().nonnegative(), percent: z.number().min(0).max(100), rooms: z.array(room) }).nullable(),
  missingRoomTimes: z.number().int().nonnegative(), roomTimeCases: z.number().int().nonnegative(),
  estimatedRoomCases: z.number().int().nonnegative(), missingUtilizationTimes: z.number().int().nonnegative(),
  hosxpAvailable: z.boolean(),
  quality: z.object({ missingSource: z.number().int().nonnegative(), missingDoctor: z.number().int().nonnegative(), missingDuration: z.number().int().nonnegative(), missingAnesthesia: z.number().int().nonnegative(), missingSurgeryClass: z.number().int().nonnegative() }),
});

export type StatisticsResponse = z.infer<typeof statisticsResponseSchema>;
