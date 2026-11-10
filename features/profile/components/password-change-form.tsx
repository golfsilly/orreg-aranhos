"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, passwordSchema } from "@/lib/password-policy";

const schema = z.object({ currentPassword: z.string().min(1).max(MAX_PASSWORD_LENGTH), newPassword: passwordSchema, confirm: z.string() }).refine((value) => value.newPassword === value.confirm, { path: ["confirm"], message: "รหัสผ่านใหม่ไม่ตรงกัน" });
type Values = z.infer<typeof schema>;
const inputClass = "mt-2 block h-12 w-full rounded-xl border border-input bg-background px-3.5 pr-12 text-sm font-normal shadow-sm transition hover:border-primary/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function PasswordChangeForm({ hasCredential }: { hasCredential: boolean }) {
  const [visible, setVisible] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirm: "" } });
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const response = await fetch("/api/profile/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error === "invalidPassword" ? "รหัสผ่านเดิมไม่ถูกต้อง" : body.error === "missingCredential" ? "บัญชีนี้ไม่มีรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ" : body.error === "rateLimited" ? "ลองหลายครั้งเกินไป กรุณารอ 10 นาทีแล้วลองใหม่" : "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่");
    },
    onSuccess: () => { form.reset(); toast.success("เปลี่ยนรหัสผ่านแล้ว"); },
    onError: (error) => toast.error(error.message),
  });
  const errorMessage = form.formState.errors.confirm?.message || (Object.keys(form.formState.errors).length ? "กรุณาตรวจสอบรหัสผ่านที่กรอก" : "");

  return <section className="overflow-hidden rounded-[24px] border border-border bg-card shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 px-5 py-5 sm:px-7 sm:py-6">
      <div className="flex items-start gap-3.5"><span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/10 bg-primary/8 text-primary"><KeyRound aria-hidden="true" className="size-5" /></span><div><p className="text-[10px] font-bold tracking-[0.16em] text-primary">ACCOUNT SECURITY</p><h2 className="mt-0.5 text-lg font-semibold tracking-tight">เปลี่ยนรหัสผ่าน</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">ยืนยันรหัสผ่านเดิมก่อนกำหนดรหัสผ่านใหม่</p></div></div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary"><ShieldCheck aria-hidden="true" className="size-3.5" />ยืนยันตัวตนก่อนเปลี่ยน</span>
    </div>
    <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_250px]">
      {!hasCredential ? <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-foreground sm:p-5">บัญชีนี้ยังไม่มีรหัสผ่านสำหรับเข้าสู่ระบบ กรุณาติดต่อผู้ดูแลระบบเพื่อกำหนดช่องทางเข้าใช้งาน</div> : <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="grid min-w-0 gap-4 sm:grid-cols-2">
        {([["currentPassword", "รหัสผ่านเดิม", "current-password"], ["newPassword", "รหัสผ่านใหม่", "new-password"], ["confirm", "ยืนยันรหัสผ่านใหม่", "new-password"]] as const).map(([key, label, autoComplete]) => <label key={key} className={`block min-w-0 text-sm font-semibold ${key === "currentPassword" ? "sm:col-span-2" : ""}`}>{label}<span className="relative block"><input {...form.register(key)} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={key === "currentPassword" ? undefined : MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} required className={inputClass} />{key === "confirm" && <button type="button" aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} onClick={() => setVisible(!visible)} className="absolute inset-y-0 right-2 my-auto grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">{visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}</button>}</span></label>)}
        {errorMessage && <p role="alert" className="text-sm text-destructive sm:col-span-2">{errorMessage}</p>}
        <div className="sm:col-span-2"><button type="submit" disabled={mutation.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50">{mutation.isPending ? <><span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />กำลังเปลี่ยน…</> : <><LockKeyhole aria-hidden="true" className="size-4" />เปลี่ยนรหัสผ่าน</>}</button></div>
      </form>}
      <aside className="rounded-2xl border border-border/80 bg-muted/35 p-4 sm:p-5"><p className="text-xs font-bold tracking-wide text-foreground">แนวทางตั้งรหัสผ่าน</p><ul className="mt-3 space-y-2.5 text-xs leading-5 text-muted-foreground"><li className="flex gap-2"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />ยาวอย่างน้อย {MIN_PASSWORD_LENGTH} ตัวอักษร</li><li className="flex gap-2"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />ใส่รหัสผ่านเดิมเพื่อยืนยันตัวตน</li><li className="flex gap-2"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />หลีกเลี่ยงการใช้รหัสผ่านซ้ำกับบริการอื่น</li></ul></aside>
    </div>
  </section>;
}
