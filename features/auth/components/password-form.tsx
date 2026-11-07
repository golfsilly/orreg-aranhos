"use client";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, passwordSchema } from "@/lib/password-policy";

const valuesSchema = z.object({ email: z.string(), password: z.string(), confirm: z.string() });
type Values = z.infer<typeof valuesSchema>;

export function PasswordForm({ mode, token, mailEnabled = true }: { mode: "forgot" | "reset"; token?: string; mailEnabled?: boolean }) {
  const [pending, setPending] = useState(false), [done, setDone] = useState(false), [error, setError] = useState("");
  const form = useForm<Values>({ resolver: zodResolver(valuesSchema), defaultValues: { email: "", password: "", confirm: "" } });
  async function submit(values: Values) {
    setError(""); setPending(true);
    try {
      if (mode === "forgot") {
        const parsedEmail = z.email().safeParse(values.email.trim().toLowerCase());
        if (!parsedEmail.success) { setError("กรุณากรอกอีเมลให้ถูกต้อง"); return; }
        const result = await authClient.requestPasswordReset({ email: parsedEmail.data, redirectTo: "/auth/reset-password" });
        if (result.error) throw new Error();
      } else {
        const password = values.password;
        if (!passwordSchema.safeParse(password).success) { setError("รหัสผ่านต้องยาว 6–128 ตัวอักษร"); return; }
        if (password !== values.confirm) { setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน"); return; }
        const result = await authClient.resetPassword({ newPassword: password, token: token ?? "" });
        if (result.error) { setError("ลิงก์ไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่"); setPending(false); return; }
      }
      setDone(true);
    } catch { setError("ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง"); }
    finally { setPending(false); }
  }
  return <div><div className="mb-7 flex size-14 items-center justify-center rounded-[18px] bg-secondary text-primary">{done ? <CheckCircle2 className="size-7" /> : mode === "forgot" ? <Mail className="size-7" /> : <KeyRound className="size-7" />}</div><p className="mb-2 text-xs font-bold tracking-[0.18em] text-primary">ACCOUNT SECURITY</p><h1 className="text-[32px] leading-tight font-semibold tracking-tight text-foreground">{done ? mode === "forgot" ? "ตรวจสอบอีเมลของคุณ" : "ตั้งรหัสผ่านแล้ว" : mode === "forgot" ? "ลืมรหัสผ่าน?" : "ตั้งรหัสผ่านใหม่"}</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">{done ? mode === "forgot" ? "หากมีอีเมลนี้ในระบบ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้" : "คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว" : mode === "forgot" ? "กรอกอีเมลที่ใช้กับบัญชี แล้วเราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่" : "ตั้งรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร"}</p>
    {!done && mode === "forgot" && !mailEnabled && <p className="mt-6 rounded-xl bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-800 dark:text-amber-200">ระบบอีเมลยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ</p>}
    {!done && mode === "reset" && !token && <p className="mt-6 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">ลิงก์ไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่</p>}
    {!done && (mode === "forgot" || token) && <form onSubmit={form.handleSubmit(submit)} className="mt-8 space-y-5">{mode === "forgot" ? <label className="block text-sm font-semibold text-foreground">อีเมล<input {...form.register("email")} type="email" autoComplete="email" required className="mt-2 block h-13 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none focus:border-ring focus:ring-4 focus:ring-ring/20" placeholder="name@hospital.go.th" /></label> : <><label className="block text-sm font-semibold text-foreground">รหัสผ่านใหม่<input {...form.register("password")} type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} required className="mt-2 block h-13 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none focus:border-ring focus:ring-4 focus:ring-ring/20" /></label><label className="block text-sm font-semibold text-foreground">ยืนยันรหัสผ่านใหม่<input {...form.register("confirm")} type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} required className="mt-2 block h-13 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none focus:border-ring focus:ring-4 focus:ring-ring/20" /></label></>}{error && <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}<Button type="submit" disabled={pending || (mode === "forgot" && !mailEnabled)} className="h-14 w-full rounded-xl">{pending ? "กำลังดำเนินการ…" : mode === "forgot" ? "ส่งลิงก์ตั้งรหัสผ่าน" : "บันทึกรหัสผ่านใหม่"}</Button></form>}
    <Link href={mode === "reset" && !token && !done ? "/auth/forgot-password" : "/auth/signin"} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="size-4" /> {mode === "reset" && !token && !done ? "ขอลิงก์ใหม่" : "กลับไปหน้าเข้าสู่ระบบ"}</Link>
  </div>;
}
