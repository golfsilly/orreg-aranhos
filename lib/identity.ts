import { createHash } from "node:crypto";

export function normalizeUsername(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Invalid username");
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9_.]{3,30}$/.test(username)) throw new Error("Invalid username");
  return username;
}

export function hashCid(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Invalid CID");
  const cid = value.replace(/[\s-]/g, "");
  if (!/^\d{13}$/.test(cid)) throw new Error("Invalid CID");
  const check = (11 - [...cid.slice(0, 12)].reduce((sum, digit, i) => sum + Number(digit) * (13 - i), 0) % 11) % 10;
  if (check !== Number(cid[12])) throw new Error("Invalid CID");
  return createHash("sha256").update(cid).digest("hex");
}
