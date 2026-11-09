type SortableRegister = Record<string, unknown>;

export type RegisterSortMode = "operationId" | "numberAsc" | "numberDesc";

function numericId(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") return null;
  try { return BigInt(String(value)); } catch { return null; }
}

function operationIdDescending(a: SortableRegister, b: SortableRegister) {
  const left = numericId(a.operation_id);
  const right = numericId(b.operation_id);
  if (left !== null && right !== null) return left > right ? -1 : left < right ? 1 : 0;
  return String(b.operation_id ?? "").localeCompare(String(a.operation_id ?? ""), "en", { numeric: true });
}

function registerSequence(value: unknown) {
  if (typeof value !== "string") return null;
  const sequence = Number(value.split("/")[0]);
  return Number.isSafeInteger(sequence) && sequence >= 0 ? sequence : null;
}

export function sortRegisterRows<T extends SortableRegister>(rows: readonly T[], mode: RegisterSortMode): T[] {
  return [...rows].sort((a, b) => {
    if (mode === "operationId") return operationIdDescending(a, b);
    const left = registerSequence(a.registerNumber);
    const right = registerSequence(b.registerNumber);
    if (left === null || right === null) {
      if (left === null && right !== null) return 1;
      if (right === null && left !== null) return -1;
    } else if (left !== right) {
      return mode === "numberAsc" ? left - right : right - left;
    }
    return operationIdDescending(a, b);
  });
}
