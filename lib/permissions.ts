export const roles = [
  "SUPERADMIN",
  "ADMIN",
  "DOCTOR",
  "NURSE",
  "USER",
] as const;
export type UserRole = (typeof roles)[number];
export type Permission =
  | "dashboard:read"
  | "users:manage"
  | "register:read"
  | "register:write"
  | "postop:read"
  | "postop:write"
  | "postop:configure"
  | "equipment:read"
  | "equipment:write"
  | "audit:read";

const permissions: Record<UserRole, readonly Permission[]> = {
  SUPERADMIN: [
    "dashboard:read",
    "users:manage",
    "register:read",
    "register:write",
    "postop:read",
    "postop:write",
    "postop:configure",
    "equipment:read",
    "equipment:write",
    "audit:read",
  ],
  ADMIN: ["dashboard:read", "users:manage"],
  NURSE: [
    "dashboard:read",
    "register:read",
    "register:write",
    "postop:read",
    "postop:write",
    "postop:configure",
    "equipment:read",
    "equipment:write",
  ],
  DOCTOR: [
    "dashboard:read",
    "register:read",
    "postop:read",
    "equipment:read",
  ],
  USER: ["dashboard:read"],
};

/** Unknown roles and permissions are always denied. */
export function hasPermission(role: string, permission: Permission): boolean {
  return (
    Object.hasOwn(permissions, role) &&
    permissions[role as UserRole].includes(permission)
  );
}
