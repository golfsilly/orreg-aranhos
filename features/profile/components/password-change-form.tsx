"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, passwordSchema } from "@/lib/password-policy";

const schema = z.object({ currentPassword: z.string().min(1).max(MAX_PASSWORD_LENGTH), newPassword: passwordSchema, confirm: z.string() }).refine((value) => value.newPassword === value.confirm, { path: ["confirm"], message: "รหัสผ่านใหม่ไม่ตรงกัน" });
type Values = z.infer<typeof schema>;
const inputClass = "mt-2 block h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal focus-visible:outline-2 focus-visible:outline-ring";
export function PasswordChangeForm({ hasCredential }: { hasCredential: boolean }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirm: "" } });
  const mutation = useMutation({ mutationFn: async (values: Values) => {
    const response = await fetch("/api/profile/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error === "invalidPassword" ? "รหัสผ่านเดิมไม่ถูกต้อง" : body.error === "missingCredential" ? "บัญชีนี้ไม่มีรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ" : body.error === "rateLimited" ? "ลองหลายครั้งเกินไป กรุณารอ 10 นาทีแล้วลองใหม่" : "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่");
  }, onSuccess: () => { form.reset(); toast.success("เปลี่ยนรหัสผ่านแล้ว"); }, onError: (error) => toast.error(error.message) });
  return <section className="rounded-[20px] border border-border bg-card p-5 shadow-[0_5px_24px_#11271a06] sm:p-7"><h2 className="text-lg font-semibold">เปลี่ยนรหัสผ่าน</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">ใช้รหัสผ่านเดิมยืนยัน และตั้งรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร</p>{!hasCredential ? <p className="mt-4 text-sm text-muted-foreground">บัญชีนี้ไม่มีรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ</p> : <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold sm:col-span-2">รหัสผ่านเดิม<input {...form.register("currentPassword")} type="password" autoComplete="current-password" maxLength={MAX_PASSWORD_LENGTH} required className={inputClass} /></label><label className="block text-sm font-semibold">รหัสผ่านใหม่<input {...form.register("newPassword")} type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} required className={inputClass} /></label><label className="block text-sm font-semibold">ยืนยันรหัสผ่านใหม่<input {...form.register("confirm")} type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} required className={inputClass} /></label>{Object.keys(form.formState.errors).length > 0 && <p role="alert" className="text-sm text-destructive sm:col-span-2">{form.formState.errors.confirm?.message || "กรุณาตรวจสอบรหัสผ่าน"}</p>}<div className="sm:col-span-2"><button type="submit" disabled={mutation.isPending} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{mutation.isPending ? "กำลังบันทึก…" : "เปลี่ยนรหัสผ่าน"}</button></div></form>}</section>;
}
