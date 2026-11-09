import type { Permission, UserRole } from "@/lib/permissions";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  CircleUserRound,
  LayoutDashboard,
  ScrollText,
  Stethoscope,
  ClipboardPlus,
  UsersRound,
} from "lucide-react";

export type WorkspaceMenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
};
type WorkspaceModule = {
  id: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  items: readonly WorkspaceMenuItem[];
};

const surgeryMenu = [
  {
    href: "/surgery/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: "dashboard:read",
  },
  {
    href: "/surgery/operations",
    label: "ทะเบียนผ่าตัด",
    icon: Stethoscope,
    permission: "register:read",
  },
  {
    href: "/surgery/calendar",
    label: "ปฏิทินห้องผ่าตัด",
    icon: CalendarDays,
    permission: "register:read",
  },
  {
    href: "/surgery/reports",
    label: "รายงานและสถิติ",
    icon: BarChart3,
    permission: "dashboard:read",
  },
] as const;

const postoperativeMenu = [
  { href: "/surgery/post-op", label: "ติดตามหลังผ่าตัด", icon: ClipboardPlus, permission: "postop:read" },
] as const;

const equipmentMenu = [
  { href: "/surgery/equipment", label: "เครื่องมือและอุปกรณ์", icon: Boxes, permission: "equipment:read" },
] as const;

export const systemDashboardItem: WorkspaceMenuItem = {
  href: "/dashboard",
  label: "ภาพรวมระบบ",
  icon: LayoutDashboard,
  permission: "dashboard:read",
};

// These routes belong to the overall application, not any one module.
export const globalWorkspaceMenu: readonly WorkspaceMenuItem[] = [
  {
    href: "/profile",
    label: "โปรไฟล์ของฉัน",
    icon: CircleUserRound,
    permission: "dashboard:read",
  },
  {
    href: "/admin/users",
    label: "จัดการผู้ใช้งาน",
    icon: UsersRound,
    permission: "users:manage",
  },
  {
    href: "/admin/audit",
    label: "ประวัติการใช้งาน",
    icon: ScrollText,
    permission: "audit:read",
  },
];

// Each module owns its menu. Add future modules here to expose them in the sidebar.
export const workspaceModules: readonly WorkspaceModule[] = [
  {
    id: "surgery",
    label: "ระบบทะเบียนผ่าตัด",
    subtitle: "SURGERY REGISTER",
    icon: Stethoscope,
    items: surgeryMenu,
  },
  {
    id: "postoperative",
    label: "ติดตามหลังผ่าตัด",
    subtitle: "POSTOPERATIVE CARE",
    icon: ClipboardPlus,
    items: postoperativeMenu,
  },
  {
    id: "equipment",
    label: "เครื่องมือและอุปกรณ์",
    subtitle: "SURGICAL EQUIPMENT",
    icon: Boxes,
    items: equipmentMenu,
  },
];
export const workspaceMenu = [
  systemDashboardItem,
  ...workspaceModules.flatMap((module) => module.items),
  ...globalWorkspaceMenu,
];
export const roleLabels: Record<UserRole, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Admin",
  NURSE: "Nurse",
  DOCTOR: "Doctor",
  USER: "User",
};
