import { z } from "zod";

const optionalText = z.string().trim().max(191).transform((value) => value || null).nullable().optional();
export const workFieldsSchema = z.object({
  organization: optionalText,
  mission: optionalText,
  workGroup: optionalText,
  jobTitle: optionalText,
  jobLevel: optionalText,
}).strict();
export const selfProfileSchema = workFieldsSchema.extend({ name: z.string().trim().min(1).max(191) }).strict();
export const workFieldNames = ["organization", "mission", "workGroup", "jobTitle", "jobLevel"] as const;
