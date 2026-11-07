// Fixed policy: the application only prunes the central AuditLog table.
// MySQL NOW(3) uses the same database session clock as AuditLog's default
// CURRENT_TIMESTAMP(3), including when the database uses local time.
export const AUDIT_RETENTION_DAYS = 30;
export const AUDIT_CLEANUP_BATCH_SIZE = 1000;
export const AUDIT_CLEANUP_MAX_BATCHES = 20;

type AuditCleanupDatabase = { $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<number> };

export async function pruneExpiredAuditLogs(db: AuditCleanupDatabase) {
  let deleted = 0;
  for (let batch = 0; batch < AUDIT_CLEANUP_MAX_BATCHES; batch++) {
    // Static SQL intentionally cannot target any other table or accept a caller-supplied cutoff.
    const count = await db.$executeRaw`DELETE FROM \`AuditLog\` WHERE \`occurredAt\` < DATE_SUB(NOW(3), INTERVAL 30 DAY) ORDER BY \`occurredAt\`, \`id\` LIMIT 1000`;
    deleted += count;
    if (count < AUDIT_CLEANUP_BATCH_SIZE) return { deleted, mayHaveMore: false };
  }
  return { deleted, mayHaveMore: true };
}
