/** Normalize an operation_list.operation_id without losing integer precision. */
export function normalizeOperationId(value: unknown): string {
  if (typeof value === "number" && (!Number.isSafeInteger(value) || value < 1))
    throw new Error("Invalid HOSxP operation ID");
  if (!["number", "bigint", "string"].includes(typeof value))
    throw new Error("Invalid HOSxP operation ID");
  const id = String(value);
  if (!/^[1-9]\d*$/.test(id)) throw new Error("Invalid HOSxP operation ID");
  return id;
}
