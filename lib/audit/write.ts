import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";

// Only these fixed, non-sensitive facts may enter the central audit trail.
// Do not add request bodies, emails, CID, patient details, passwords or tokens.
export const auditMetadataSchema = z.object({
  channel: z.enum(["EMAIL", "USERNAME", "PROVIDER_ID", "SESSION", "UNKNOWN"]).optional(),
  action: z.enum(["REVOKE_SESSION", "REVOKE_SESSIONS", "REVOKE_OTHER_SESSIONS", "LINK_ACCOUNT", "UNLINK_ACCOUNT", "DELETE_ACCOUNT", "SET_PASSWORD"]).optional(),
  reason: z.enum(["INVALID_INPUT", "CONFLICT", "NOT_FOUND", "UNAVAILABLE"]).optional(),
  previousRole: z.enum(["SUPERADMIN", "ADMIN", "NURSE", "USER"]).optional(),
  role: z.enum(["SUPERADMIN", "ADMIN", "NURSE", "USER"]).optional(),
  previousActive: z.boolean().optional(),
  active: z.boolean().optional(),
  passwordChanged: z.boolean().optional(),
  providerIdentityChanged: z.boolean().optional(),
  usernameChanged: z.boolean().optional(),
  nameChanged: z.boolean().optional(),
  emailChanged: z.boolean().optional(),
  total: z.number().int().nonnegative().optional(),
  created: z.number().int().nonnegative().optional(),
  renumbered: z.number().int().nonnegative().optional(),
  dateUpdated: z.number().int().nonnegative().optional(),
  existing: z.number().int().nonnegative().optional(),
  revision: z.number().int().nonnegative().optional(),
  date: z.iso.date().optional(),
  fiscalYear: z.number().int().min(2400).max(2800).optional(),
  avatarChanged: z.boolean().optional(),
  signatureChanged: z.boolean().optional(),
  workDetailsChanged: z.boolean().optional(),
}).strict();

export const auditEvents = ["AUTH_SESSION_CREATED", "AUTH_LOGIN_FAILED", "AUTH_LOGOUT", "AUTH_PASSWORD_RESET_REQUESTED", "AUTH_PASSWORD_RESET", "AUTH_PASSWORD_CHANGE", "AUTH_PROFILE_CHANGE", "AUTH_PROVIDER_LINKED", "AUTH_SECURITY_ACTION", "USER_BOOTSTRAPPED", "USERS_READ", "USER_CREATED", "USER_UPDATED", "USER_DELETED", "USER_RESTORED", "PROFILE_UPDATED", "REGISTER_CREATED", "REGISTER_DATE_CHANGED", "REGISTER_TIMES_UPDATED", "REGISTER_DETAILS_UPDATED", "HOSXP_SYNC", "HOSXP_OPERATIONS_READ", "HOSXP_TEAM_READ", "REGISTER_TIMES_READ", "REGISTER_DETAILS_READ", "REGISTER_HISTORY_READ", "AUDIT_LOG_READ", "REPORT_PDF_EXPORTED", "PROFILE_ASSET_UPDATED", "PROFILE_SIGNATURE_READ"] as const;
export type AuditEvent = (typeof auditEvents)[number];
type Metadata = z.infer<typeof auditMetadataSchema>;
export type AuditRecord = {
  actorId?: string | null;
  event: AuditEvent;
  outcome: "SUCCESS" | "FAILURE" | "DENIED";
  targetType?: "USER" | "REGISTER" | "HOSXP_OPERATION" | "HOSXP_DAY" | null;
  targetId?: string | null;
  metadata?: Metadata;
};

/** Pass the active transaction for mutations; a failed audit insert rolls back the change. */
export async function writeAudit(db: Pick<Prisma.TransactionClient, "auditLog">, record: AuditRecord) {
  const metadata = record.metadata ? auditMetadataSchema.parse(record.metadata) : undefined;
  if (!auditEvents.includes(record.event) || (record.actorId && record.actorId.length > 191) || (record.targetId && record.targetId.length > 191)) throw new Error("Invalid audit event");
  await db.auditLog.create({ data: { actorId: record.actorId ?? null, event: record.event, outcome: record.outcome, targetType: record.targetType ?? null, targetId: record.targetId ?? null, ...(metadata ? { metadata } : {}) } });
}
