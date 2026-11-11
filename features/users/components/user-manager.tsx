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
  Building2,
  CircleUserRound,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
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
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part.slice(0, 1)).join("") || "U";

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
  const userActions = (user: User, compact = false) => {
    if (!isSuperadmin && user.role === "SUPERADMIN") return null;
    const actionClass = compact
      ? "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
      : "inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition hover:border-primary/25 hover:bg-accent hover:text-primary focus-visible:outline-2 focus-visible:outline-ring";
    if (user.deletedAt) return <button type="button" className={`${actionClass} ${compact ? "text-primary" : ""}`} title="กู้คืนบัญชี" aria-label={`กู้คืนบัญชี ${user.name}`} onClick={() => { setError(""); setAction({ user, restore: true }); }}><RotateCcw aria-hidden="true" className="size-4" />{compact && "กู้คืนบัญชี"}</button>;
    return <>
      <button type="button" className={actionClass} title="แก้ไขบัญชี" aria-label={`แก้ไขบัญชี ${user.name}`} onClick={() => openForm(user)}><Pencil aria-hidden="true" className="size-4" />{compact && "แก้ไข"}</button>
      {user.id !== actorId && <button type="button" className={`${actionClass} ${compact ? "text-destructive hover:bg-destructive/5" : "hover:border-destructive/25 hover:bg-destructive/5 hover:text-destructive"}`} title="ลบบัญชี" aria-label={`ลบบัญชี ${user.name}`} onClick={() => { setError(""); setAction({ user, restore: false }); }}><Trash2 aria-hidden="true" className="size-4" />{compact && "ลบ"}</button>}
    </>;
  };
  return (
    <>
      <section className="min-w-0 overflow-hidden rounded-[26px] border border-border bg-card shadow-md">
        <div className="relative isolate overflow-hidden border-b border-border/80 bg-gradient-to-br from-primary/[0.07] via-card to-card/[0.06] px-5 py-5 sm:px-7 sm:py-6">
          <div aria-hidden="true" className="absolute -right-16 -top-24 -z-10 size-64 rounded-full border border-primary/10" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3.5"><span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-primary/10 bg-card text-primary shadow-sm"><UsersRound aria-hidden="true" className="size-5" /></span><div><p className="text-[10px] font-bold tracking-[0.17em] text-primary">IDENTITY & ACCESS</p><h2 className="mt-0.5 text-xl font-semibold tracking-tight">ทะเบียนบัญชีผู้ใช้</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">จัดการสิทธิ์การเข้าถึงและข้อมูลบัญชีอย่างเป็นระบบ</p></div></div>
            <button type="button" onClick={() => openForm()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto"><Plus aria-hidden="true" className="size-4" />เพิ่มผู้ใช้</button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:max-w-[620px] sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-card/75 px-3.5 py-3"><span className="text-[10px] font-medium text-muted-foreground">ผลลัพธ์ตามตัวกรอง</span><strong className="mt-1 block text-lg font-semibold tabular-nums">{total.toLocaleString("th-TH")} <span className="text-xs font-medium text-muted-foreground">บัญชี</span></strong></div>
            <div className="rounded-2xl border border-border/70 bg-card/75 px-3.5 py-3"><span className="text-[10px] font-medium text-muted-foreground">หน้าปัจจุบัน</span><strong className="mt-1 block text-lg font-semibold tabular-nums">{page.toLocaleString("th-TH")} <span className="text-xs font-medium text-muted-foreground">/ {pages.toLocaleString("th-TH")}</span></strong></div>
            <div className="col-span-2 rounded-2xl border border-border/70 bg-card/75 px-3.5 py-3 sm:col-span-1"><span className="text-[10px] font-medium text-muted-foreground">สิทธิ์ผู้ดูแล</span><strong className="mt-1 flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck aria-hidden="true" className="size-4 text-primary" />{isSuperadmin ? "Superadmin" : "Admin"}</strong></div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 sm:p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(130px,0.24fr))_44px] lg:items-end">
              <form className="flex min-w-0 gap-2" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}>
                <label className="sr-only" htmlFor="user-search">ค้นหาผู้ใช้</label>
                <div className="relative min-w-0 flex-1"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input id="user-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} maxLength={100} placeholder="ค้นหาชื่อ อีเมล หน่วยงาน หรือตำแหน่ง" className="h-11 w-full min-w-0 rounded-xl border border-input bg-background pl-9 pr-3 text-sm shadow-sm transition placeholder:text-muted-foreground/75 hover:border-primary/35 focus-visible:outline-2 focus-visible:outline-ring" /></div>
                <button type="submit" className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-ring" aria-label="ค้นหา"><Search aria-hidden="true" className="size-4" /></button>
              </form>
              <label className="block min-w-0 text-[11px] font-semibold text-muted-foreground">สถานะ<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={`${field} mt-1.5 h-11 bg-background shadow-sm`}><option value="current">บัญชีปัจจุบัน</option><option value="active">ใช้งาน</option><option value="inactive">ระงับ</option><option value="deleted">บัญชีที่ลบ</option><option value="all">ทั้งหมด</option></select></label>
              <label className="block min-w-0 text-[11px] font-semibold text-muted-foreground">บทบาท<select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} className={`${field} mt-1.5 h-11 bg-background shadow-sm`}><option value="">ทุกบทบาท</option>{roles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}</select></label>
              <label className="block min-w-0 text-[11px] font-semibold text-muted-foreground">เรียงตาม<select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className={`${field} mt-1.5 h-11 bg-background shadow-sm`}><option value="name">ชื่อ</option><option value="email">อีเมล</option><option value="role">บทบาท</option><option value="organization">องค์กร</option><option value="jobTitle">ตำแหน่ง</option><option value="createdAt">วันที่สร้าง</option></select></label>
              <button type="button" onClick={() => { setDirection(direction === "asc" ? "desc" : "asc"); setPage(1); }} className={`${button} h-11 w-full px-2 text-base`} aria-label={direction === "asc" ? "เรียงจากน้อยไปมาก เปลี่ยนเป็นมากไปน้อย" : "เรียงจากมากไปน้อย เปลี่ยนเป็นน้อยไปมาก"} title={direction === "asc" ? "เรียงจากน้อยไปมาก" : "เรียงจากมากไปน้อย"}>{direction === "asc" ? "↑" : "↓"}</button>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] leading-5 text-muted-foreground"><Building2 aria-hidden="true" className="size-3.5 shrink-0" />ค้นหาได้จากชื่อ อีเมล ชื่อผู้ใช้ หน่วยงาน และตำแหน่ง</p>
          </div>
          {users.isPending ? (
            <div aria-label="กำลังโหลดบัญชี" className="mt-5 space-y-3">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-[76px] w-full rounded-2xl" />)}</div>
          ) : users.isError ? (
            <div role="alert" className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">ไม่สามารถโหลดบัญชีได้ กรุณาลองใหม่</div>
          ) : (
            <>
              <p className="mt-5 text-xs text-muted-foreground">พบ {total.toLocaleString("th-TH")} บัญชี <span className="md:hidden">· แสดงเป็นรายการเพื่อใช้งานบนมือถือ</span></p>
              <div className="mt-3 grid gap-3 sm:hidden">
                {users.data?.users.map((user) => <article key={user.id} className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start gap-3"><span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/15 to-card/20 text-sm font-bold text-primary ring-1 ring-primary/10">{initials(user.name)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{user.name}</h3><p className="mt-0.5 break-all text-xs text-muted-foreground">{user.username ? `@${user.username}` : user.email}</p></div><span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${user.deletedAt ? "bg-muted text-muted-foreground" : user.isActive ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-800 dark:text-amber-300"}`}><span className={`size-1.5 rounded-full ${user.deletedAt ? "bg-muted-foreground/60" : user.isActive ? "bg-primary" : "bg-amber-500"}`} />{user.deletedAt ? "ลบแล้ว" : user.isActive ? "ใช้งาน" : "ระงับ"}</span></div><p className="mt-2 flex min-w-0 items-start gap-1.5 break-all text-xs text-muted-foreground"><span className="mt-0.5 text-primary"><CircleUserRound aria-hidden="true" className="size-3.5" /></span>{user.email}</p></div></div>
                  <div className="mt-4 grid grid-cols-2 gap-2"><div className="min-w-0 rounded-xl bg-muted/50 px-3 py-2.5"><span className="block text-[10px] text-muted-foreground">หน่วยงาน</span><span className="mt-1 block truncate text-xs font-medium">{[user.organization, user.mission, user.workGroup].filter(Boolean).join(" · ") || "ยังไม่ระบุ"}</span></div><div className="min-w-0 rounded-xl bg-muted/50 px-3 py-2.5"><span className="block text-[10px] text-muted-foreground">ตำแหน่ง / บทบาท</span><span className="mt-1 block truncate text-xs font-medium">{[user.jobTitle, user.jobLevel].filter(Boolean).join(" · ") || roleLabels[user.role]}</span></div></div>
                  <div className="mt-3 flex items-center justify-between gap-3"><span className="rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold text-primary">{roleLabels[user.role]}</span><div className="flex min-w-0 flex-1 gap-2">{userActions(user, true)}</div></div>
                </article>)}
              </div>
              <div className="mt-3 hidden md:block">
                <ResponsiveScroll label="ตารางบัญชีผู้ใช้ เลื่อนด้านข้างได้">
                  <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left text-sm">
                    <thead><tr>{["บัญชีผู้ใช้", "องค์กร / ภารกิจ / กลุ่มงาน", "ตำแหน่ง / ระดับ", "บทบาท", "สถานะ", "จัดการ"].map((label) => <th key={label} className="sticky top-0 border-b border-border bg-muted/60 px-4 py-3.5 text-[11px] font-bold tracking-wide text-muted-foreground first:rounded-tl-xl last:rounded-tr-xl">{label}</th>)}</tr></thead>
                    <tbody>{table.getRowModel().rows.map(({ original: user }) => <tr key={user.id} className="group transition hover:bg-primary/[0.035]">
                      <td className="border-b border-border/70 px-4 py-3.5"><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-card/20 text-xs font-bold text-primary ring-1 ring-primary/10">{initials(user.name)}</span><div className="min-w-0"><strong className="block max-w-[240px] truncate text-sm font-semibold">{user.name}</strong><span className="mt-0.5 block max-w-[240px] truncate text-xs text-muted-foreground">{user.username ? `@${user.username}` : user.email}</span></div></div></td>
                      <td className="max-w-[290px] border-b border-border/70 px-4 py-3.5"><span className="block truncate text-sm">{[user.organization, user.mission, user.workGroup].filter(Boolean).join(" / ") || "—"}</span></td>
                      <td className="max-w-[230px] border-b border-border/70 px-4 py-3.5"><span className="block truncate text-sm">{[user.jobTitle, user.jobLevel].filter(Boolean).join(" / ") || "—"}</span></td>
                      <td className="border-b border-border/70 px-4 py-3.5"><span className="inline-flex rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary">{roleLabels[user.role]}</span></td>
                      <td className="border-b border-border/70 px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${user.deletedAt ? "bg-muted text-muted-foreground" : user.isActive ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-800 dark:text-amber-300"}`}><span className={`size-1.5 rounded-full ${user.deletedAt ? "bg-muted-foreground/60" : user.isActive ? "bg-primary" : "bg-amber-500"}`} />{user.deletedAt ? "ลบแล้ว" : user.isActive ? "ใช้งาน" : "ระงับ"}</span></td>
                      <td className="border-b border-border/70 px-4 py-3.5"><div className="flex gap-2">{userActions(user)}</div></td>
                    </tr>)}</tbody>
                  </table>
                </ResponsiveScroll>
              </div>
              {total === 0 && <div className="mt-4 rounded-2xl border border-dashed border-border px-4 py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><UsersRound aria-hidden="true" className="size-5" /></span><p className="mt-3 text-sm font-semibold">ไม่พบบัญชีที่ตรงกับเงื่อนไข</p><p className="mt-1 text-xs text-muted-foreground">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะและบทบาท</p></div>}
              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs text-muted-foreground">หน้า {page.toLocaleString("th-TH")} จาก {pages.toLocaleString("th-TH")} · {total.toLocaleString("th-TH")} บัญชี</span><div className="grid grid-cols-2 gap-2 sm:flex"><button type="button" className={button} disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft aria-hidden="true" className="size-4" />ก่อนหน้า</button><button type="button" className={button} disabled={page >= pages} onClick={() => setPage(page + 1)}>ถัดไป<ChevronRight aria-hidden="true" className="size-4" /></button></div></div>
            </>
          )}
        </div>
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
          <section className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5">
            <div className="mb-1 flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CircleUserRound aria-hidden="true" className="size-4" /></span><div><h3 className="text-sm font-semibold">ข้อมูลบัญชีและสิทธิ์</h3><p className="mt-0.5 text-xs leading-5 text-muted-foreground">กำหนดตัวตนสำหรับเข้าสู่ระบบและบทบาทการใช้งาน</p></div></div>
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
          </section>
          <WorkFields register={form.register} disabled={save.isPending} />
          {editing && (
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3.5 text-sm font-semibold transition hover:border-primary/25">
              <input {...form.register("isActive")} type="checkbox" className="size-4 accent-primary" />
              <span className="flex-1">เปิดใช้งานบัญชี</span><span className="text-xs font-normal text-muted-foreground">ปิดเมื่อระงับบัญชี</span>
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
            : "บัญชีนี้จะเข้าสู่ระบบไม่ได้ ระบบจะยกเลิก session แต่เก็บประวัติและทะเบียนที่เกี่ยวข้องไว้"
        }
      >
        {action?.user && <div className={`mt-1 flex items-center gap-3 rounded-2xl border p-4 ${action.restore ? "border-primary/15 bg-primary/[0.04]" : "border-destructive/20 bg-destructive/[0.04]"}`}><span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold ${action.restore ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{initials(action.user.name)}</span><div className="min-w-0"><p className="break-words text-sm font-semibold">{action.user.name}</p><p className="mt-0.5 break-all text-xs text-muted-foreground">{action.user.email}</p><span className="mt-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{roleLabels[action.user.role]}</span></div></div>}
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
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${action?.restore ? "bg-primary hover:bg-primary/90" : "bg-destructive hover:bg-destructive/90"}`}
            disabled={changeStatus.isPending}
            onClick={() => action && changeStatus.mutate(action)}
          >
            {changeStatus.isPending
              ? "กำลังดำเนินการ…"
              : action?.restore
                ? <><RotateCcw aria-hidden="true" className="size-4" />ยืนยันกู้คืน</>
                : <><Trash2 aria-hidden="true" className="size-4" />ยืนยันลบ</>}
          </button>
        </div>
      </AppDialog>
    </>
  );
}
