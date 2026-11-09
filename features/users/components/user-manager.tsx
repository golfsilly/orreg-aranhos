"use client";

import { AppDialog } from "@/components/ui/app-dialog";
import { ResponsiveScroll } from "@/components/ui/responsive-scroll";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkFields } from "@/features/shared/components/work-fields";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordSchema,
} from "@/lib/password-policy";
import { roles, type UserRole } from "@/lib/permissions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type User = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: UserRole;
  isActive: boolean;
  deletedAt: string | null;
  organization: string | null;
  mission: string | null;
  workGroup: string | null;
  jobTitle: string | null;
  jobLevel: string | null;
  createdAt: string;
};
type Result = { users: User[]; total: number; page: number; pageSize: number };
const roleLabels: Record<UserRole, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Admin",
  NURSE: "Nurse",
  DOCTOR: "Doctor",
  USER: "User",
};
const optional = z.string().trim().max(191);
const schema = z.object({
  name: z.string().trim().min(1).max(191),
  email: z.email().max(191),
  username: z.string().regex(/^$|^[A-Za-z0-9_.]{3,30}$/),
  role: z.enum(roles),
  password: z.union([z.literal(""), passwordSchema]),
  cid: z.string().regex(/^$|^\d{13}$/),
  isActive: z.boolean(),
  organization: optional,
  mission: optional,
  workGroup: optional,
  jobTitle: optional,
  jobLevel: optional,
});
type Input = z.input<typeof schema>;
const empty: Input = {
  name: "",
  email: "",
  username: "",
  role: "USER",
  password: "",
  cid: "",
  isActive: true,
  organization: "",
  mission: "",
  workGroup: "",
  jobTitle: "",
  jobLevel: "",
};
const features = tableFeatures({});
const column = createColumnHelper<typeof features, User>();
const columns = column.columns([
  column.accessor("name", { header: "ชื่อ" }),
  column.accessor("email", { header: "อีเมล" }),
  column.accessor("role", { header: "บทบาท" }),
]);
const field =
  "mt-2 block h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";

export function UserManager({
  isSuperadmin,
  actorId,
}: {
  isSuperadmin: boolean;
  actorId: string;
}) {
  const client = useQueryClient();
  const [editing, setEditing] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [action, setAction] = useState<{ user: User; restore: boolean } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("current");
  const [role, setRole] = useState("");
  const [sort, setSort] = useState("name");
  const [direction, setDirection] = useState("asc");
  const [page, setPage] = useState(1);
  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: empty,
  });
  const params = new URLSearchParams({
    search,
    status,
    role,
    sort,
    direction,
    page: String(page),
    pageSize: "20",
  });
  const users = useQuery({
    queryKey: ["users", params.toString()],
    queryFn: async ({ signal }): Promise<Result> => {
      const response = await fetch(`/api/users?${params}`, {
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error("ไม่สามารถโหลดบัญชีผู้ใช้ได้");
      return response.json();
    },
  });
  const table = useTable({ features, columns, data: users.data?.users ?? [] });
  async function request(url: string, method: string, body?: unknown) {
    const response = await fetch(url, {
      method,
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const messages: Record<string, string> = {
        lastSuperadmin: "ต้องมี superadmin ที่ใช้งานอยู่อย่างน้อยหนึ่งบัญชี",
        self: "ไม่สามารถลบบัญชีของตนเองได้",
        deleted: "บัญชีนี้ถูกลบแล้ว โปรดกู้คืนก่อนแก้ไข",
        missingCredential: "บัญชีนี้ไม่มีข้อมูลรหัสผ่าน",
        superadminExists:
          "ระบบมีบัญชี Superadmin อยู่แล้ว กำหนดได้เพียงหนึ่งบัญชี",
        "Invalid username or CID": "ชื่อผู้ใช้หรือเลขประจำตัวประชาชนไม่ถูกต้อง",
        "Invalid request": "กรุณาตรวจสอบข้อมูลที่กรอก",
        "Duplicate identity":
          "อีเมล ชื่อผู้ใช้ หรือเลขประจำตัวถูกใช้งานแล้ว รวมถึงบัญชีที่ลบไว้",
      };
      throw new Error(
        messages[result.error] ??
          (response.status === 403
            ? "คุณไม่มีสิทธิ์ดำเนินการกับบัญชีนี้"
            : "ไม่สามารถดำเนินการได้ โปรดตรวจสอบข้อมูลแล้วลองอีกครั้ง"),
      );
    }
  }
  const save = useMutation({
    mutationFn: async (values: Input) => {
      if (!editing && values.password.length < MIN_PASSWORD_LENGTH)
        throw new Error("รหัสผ่านเริ่มต้นต้องมีอย่างน้อย 6 ตัวอักษร");
      const body = {
        name: values.name,
        email: values.email,
        username: values.username,
        role: values.role,
        organization: values.organization,
        mission: values.mission,
        workGroup: values.workGroup,
        jobTitle: values.jobTitle,
        jobLevel: values.jobLevel,
        ...(editing ? { isActive: values.isActive } : {}),
        ...(!editing || values.password ? { password: values.password } : {}),
        ...(values.cid ? { cid: values.cid } : {}),
      };
      await request(
        editing ? `/api/users/${encodeURIComponent(editing.id)}` : "/api/users",
        editing ? "PATCH" : "POST",
        body,
      );
    },
    onSuccess: async () => {
      toast.success(editing ? "บันทึกบัญชีแล้ว" : "เพิ่มบัญชีแล้ว");
      setFormOpen(false);
      await client.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (cause) => setError(cause.message),
  });
  const changeStatus = useMutation({
    mutationFn: async (value: { user: User; restore: boolean }) =>
      request(
        `/api/users/${encodeURIComponent(value.user.id)}`,
        value.restore ? "POST" : "DELETE",
      ),
    onSuccess: async (_, value) => {
      toast.success(
        value.restore
          ? "กู้คืนบัญชีแล้ว กรุณาเปิดใช้งานเมื่อต้องการ"
          : "ลบบัญชีแล้ว",
      );
      setAction(null);
      await client.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (cause) => setError(cause.message),
  });
  function openForm(user?: User) {
    setError("");
    setEditing(user ?? null);
    form.reset(
      user
        ? {
            ...empty,
            name: user.name,
            email: user.email,
            username: user.username ?? "",
            role: user.role,
            isActive: user.isActive,
            organization: user.organization ?? "",
            mission: user.mission ?? "",
            workGroup: user.workGroup ?? "",
            jobTitle: user.jobTitle ?? "",
            jobLevel: user.jobLevel ?? "",
          }
        : empty,
    );
    setFormOpen(true);
  }
  const total = users.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));
  const errorLabels: Record<string, string> = {
    name: "กรุณาระบุชื่อ",
    email: "กรุณาระบุอีเมลให้ถูกต้อง",
    username: "ชื่อผู้ใช้ต้องมี 3–30 ตัวอักษรภาษาอังกฤษ ตัวเลข จุด หรือขีดล่าง",
    password: "รหัสผ่านต้องยาว 6–128 ตัวอักษร",
    cid: "เลขประจำตัวต้องมี 13 หลัก",
    role: "กรุณาเลือกบทบาท",
  };
  const validationErrors = Object.keys(form.formState.errors).map(
    (key) => errorLabels[key] ?? "ข้อมูลหน่วยงานหรือตำแหน่งยาวเกินไป",
  );
  const assignableRoles = roles.filter((item) =>
    item === "SUPERADMIN"
      ? isSuperadmin && editing?.role === "SUPERADMIN"
      : item === "ADMIN"
        ? isSuperadmin || editing?.role === "ADMIN"
        : true,
  );
  return (
    <>
      <section className="min-w-0 rounded-[20px] border border-border bg-card p-4 shadow-[0_5px_24px_#11271a06] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">บัญชีผู้ใช้</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ค้นหาและจัดการบัญชีทั้งหมดในระบบ
            </p>
          </div>
          <button
            type="button"
            onClick={() => openForm()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" /> เพิ่มผู้ใช้
          </button>
        </div>
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchInput.trim());
            }}
          >
            <label className="sr-only" htmlFor="user-search">
              ค้นหาผู้ใช้
            </label>
            <input
              id="user-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              maxLength={100}
              placeholder="ค้นหาชื่อ อีเมล หน่วยงาน หรือตำแหน่ง"
              className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            />
            <button className={button} aria-label="ค้นหา">
              <Search className="size-4" />
            </button>
          </form>
          <label className="text-xs font-semibold text-muted-foreground">
            สถานะ
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className={field}
            >
              <option value="current">บัญชีปัจจุบัน</option>
              <option value="active">ใช้งาน</option>
              <option value="inactive">ระงับ</option>
              <option value="deleted">บัญชีที่ลบ</option>
              <option value="all">ทั้งหมด</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            บทบาท
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
              className={field}
            >
              <option value="">ทุกบทบาท</option>
              {roles.map((item) => (
                <option key={item} value={item}>
                  {roleLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            เรียงตาม
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
              className={field}
            >
              <option value="name">ชื่อ</option>
              <option value="email">อีเมล</option>
              <option value="role">บทบาท</option>
              <option value="organization">องค์กร</option>
              <option value="jobTitle">ตำแหน่ง</option>
              <option value="createdAt">วันที่สร้าง</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setDirection(direction === "asc" ? "desc" : "asc");
              setPage(1);
            }}
            className={button}
            aria-label={
              direction === "asc"
                ? "เรียงจากน้อยไปมาก เปลี่ยนเป็นมากไปน้อย"
                : "เรียงจากมากไปน้อย เปลี่ยนเป็นน้อยไปมาก"
            }
          >
            {direction === "asc" ? "↑" : "↓"}
          </button>
        </div>
        {users.isPending ? (
          <div aria-label="กำลังโหลดบัญชี" className="mt-6 space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : users.isError ? (
          <p role="alert" className="mt-6 text-sm text-destructive">
            ไม่สามารถโหลดบัญชีได้ กรุณาลองใหม่
          </p>
        ) : (
          <>
            <p className="mt-5 text-xs text-muted-foreground">
              พบ {total.toLocaleString("th-TH")} บัญชี{" "}
              <span className="md:hidden">
                · เลื่อนตารางด้านข้างเพื่อดูข้อมูลทั้งหมด
              </span>
            </p>
            <ResponsiveScroll label="ตารางบัญชีผู้ใช้ เลื่อนด้านข้างได้">
              <table className="mt-2 w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead>
                  <tr>
                    {[
                      "ชื่อ / ชื่อผู้ใช้",
                      "อีเมล",
                      "องค์กร / ภารกิจ / กลุ่มงาน",
                      "ตำแหน่ง / ระดับ",
                      "บทบาท",
                      "สถานะ",
                      "จัดการ",
                    ].map((label) => (
                      <th
                        key={label}
                        className="border-b border-border px-3 py-3 text-xs font-semibold text-muted-foreground"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.getRowModel().rows.map(({ original: user }) => (
                    <tr key={user.id}>
                      <td className="border-b border-border px-3 py-4">
                        <strong>{user.name}</strong>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {user.username || "—"}
                        </span>
                      </td>
                      <td className="border-b border-border px-3 py-4">
                        {user.email}
                      </td>
                      <td className="border-b border-border px-3 py-4">
                        {[user.organization, user.mission, user.workGroup]
                          .filter(Boolean)
                          .join(" / ") || "—"}
                      </td>
                      <td className="border-b border-border px-3 py-4">
                        {[user.jobTitle, user.jobLevel]
                          .filter(Boolean)
                          .join(" / ") || "—"}
                      </td>
                      <td className="border-b border-border px-3 py-4">
                        {roleLabels[user.role]}
                      </td>
                      <td className="border-b border-border px-3 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.deletedAt ? "bg-muted text-muted-foreground" : user.isActive ? "bg-secondary text-primary" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"}`}
                        >
                          {user.deletedAt
                            ? "ลบแล้ว"
                            : user.isActive
                              ? "ใช้งาน"
                              : "ระงับ"}
                        </span>
                      </td>
                      <td className="border-b border-border px-3 py-4">
                        <div className="flex gap-2">
                          {(isSuperadmin || user.role !== "SUPERADMIN") &&
                            (user.deletedAt ? (
                              <button
                                type="button"
                                className={button}
                                onClick={() => {
                                  setError("");
                                  setAction({ user, restore: true });
                                }}
                              >
                                <RotateCcw className="size-4" /> กู้คืน
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className={button}
                                  onClick={() => openForm(user)}
                                >
                                  <Pencil className="size-4" /> แก้ไข
                                </button>
                                {user.id !== actorId && (
                                  <button
                                    type="button"
                                    className={`${button} text-destructive`}
                                    onClick={() => {
                                      setError("");
                                      setAction({ user, restore: false });
                                    }}
                                  >
                                    <Trash2 className="size-4" /> ลบ
                                  </button>
                                )}
                              </>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveScroll>
            {total === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                ไม่พบบัญชีที่ตรงกับเงื่อนไข
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                หน้า {page} / {pages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={button}
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="size-4" /> ก่อนหน้า
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={page >= pages}
                  onClick={() => setPage(page + 1)}
                >
                  ถัดไป <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
      <AppDialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!save.isPending) setFormOpen(open);
        }}
        title={editing ? "แก้ไขบัญชีผู้ใช้" : "เพิ่มบัญชีผู้ใช้"}
        description="กรอกข้อมูลบัญชีและหน่วยงาน ช่องที่ไม่บังคับสามารถเว้นว่างได้"
      >
        <form
          onSubmit={form.handleSubmit((values) => {
            setError("");
            save.mutate(values);
          })}
          className="space-y-6"
        >
          <div className="grid gap-x-4 sm:grid-cols-2">
            <label className="mt-3 block text-sm font-semibold">
              ชื่อ{" "}
              <input
                {...form.register("name")}
                maxLength={191}
                required
                className={field}
              />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              อีเมล{" "}
              <input
                {...form.register("email")}
                type="email"
                maxLength={191}
                required
                className={field}
              />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              ชื่อผู้ใช้ (ไม่บังคับ)
              <input
                {...form.register("username")}
                maxLength={30}
                className={field}
              />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              บทบาท
              <select {...form.register("role")} className={field}>
                {assignableRoles.map((item) => (
                  <option key={item} value={item}>
                    {roleLabels[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              {editing
                ? "รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)"
                : "รหัสผ่านเริ่มต้น"}
              <input
                {...form.register("password")}
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
                required={!editing}
                className={field}
              />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              เลขประจำตัวสำหรับ Provider ID
              <input
                {...form.register("cid")}
                inputMode="numeric"
                maxLength={13}
                autoComplete="off"
                placeholder={
                  editing ? "เว้นว่างหากไม่เปลี่ยน" : "13 หลัก (ไม่บังคับ)"
                }
                className={field}
              />
            </label>
          </div>
          <WorkFields register={form.register} disabled={save.isPending} />
          {editing && (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                {...form.register("isActive")}
                type="checkbox"
                className="size-4 accent-primary"
              />{" "}
              เปิดใช้งานบัญชี
            </label>
          )}
          {(error || validationErrors.length > 0) && (
            <div role="alert" className="space-y-1 text-sm text-destructive">
              {error ? (
                <p>{error}</p>
              ) : (
                validationErrors.map((message) => (
                  <p key={message}>{message}</p>
                ))
              )}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              className={button}
              onClick={() => setFormOpen(false)}
              disabled={save.isPending}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              disabled={save.isPending}
            >
              {save.isPending ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </div>
        </form>
      </AppDialog>
      <AppDialog
        open={Boolean(action)}
        onOpenChange={(open) => {
          if (!open && !changeStatus.isPending) setAction(null);
        }}
        title={action?.restore ? "กู้คืนบัญชี" : "ลบบัญชีผู้ใช้"}
        description={
          action?.restore
            ? "บัญชีที่กู้คืนยังคงถูกระงับ จนกว่าผู้ดูแลจะเปิดใช้งาน"
            : "บัญชีจะเข้าใช้งานไม่ได้ แต่ประวัติและทะเบียนที่เกี่ยวข้องยังคงอยู่"
        }
      >
        <p className="break-words text-sm">
          {action?.user.name} · {action?.user.email}
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className={button}
            onClick={() => setAction(null)}
            disabled={changeStatus.isPending}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50 ${action?.restore ? "bg-primary" : "bg-destructive"}`}
            disabled={changeStatus.isPending}
            onClick={() => action && changeStatus.mutate(action)}
          >
            {changeStatus.isPending
              ? "กำลังดำเนินการ…"
              : action?.restore
                ? "ยืนยันกู้คืน"
                : "ยืนยันลบ"}
          </button>
        </div>
      </AppDialog>
    </>
  );
}
