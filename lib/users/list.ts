import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { roles } from "@/lib/permissions";
import type { Prisma } from "@/generated/prisma/client";

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(""),
  status: z.enum(["current", "active", "inactive", "deleted", "all"]).default("current"),
  role: z.union([z.enum(roles), z.literal("")]).default(""),
  sort: z.enum(["name", "email", "role", "createdAt", "organization", "jobTitle"]).default("name"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});
export const userListSelect = { id: true, name: true, email: true, username: true, role: true, isActive: true, deletedAt: true, createdAt: true, updatedAt: true, organization: true, mission: true, workGroup: true, jobTitle: true, jobLevel: true } as const;

export async function listUsers(query: z.infer<typeof listQuerySchema>) {
  const where: Prisma.UserWhereInput = {
    ...(query.status === "deleted" ? { deletedAt: { not: null } } : query.status === "all" ? {} : { deletedAt: null }),
    ...(query.status === "active" ? { isActive: true } : query.status === "inactive" ? { isActive: false } : {}),
    ...(query.role ? { role: query.role } : {}),
    ...(query.search ? { OR: ["name", "email", "username", "organization", "mission", "workGroup", "jobTitle", "jobLevel"].map((field) => ({ [field]: { contains: query.search } })) } : {}),
  };
  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, select: userListSelect, orderBy: [{ [query.sort]: query.direction }, { id: "asc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
  ]);
  return { users, total, page: query.page, pageSize: query.pageSize };
}
