export const roles = ["SUPERADMIN", "ADMIN", "NURSE", "USER"] as const;
export type UserRole = (typeof roles)[number];
export type Permission = "dashboard:read" | "users:manage" | "register:read" | "register:write";

const permissions: Record<UserRole, readonly Permission[]> = {
  SUPERADMIN: ["dashboard:read", "users:manage", "register:read", "register:write"],
  ADMIN: ["dashboard:read", "users:manage"],
  NURSE: ["dashboard:read", "register:read", "register:write"],
  USER: ["dashboard:read"],
};

/** Unknown roles and permissions are always denied. */
export function hasPermission(role: string, permission: Permission): boolean {
  return Object.hasOwn(permissions, role) && permissions[role as UserRole].includes(permission);
}
