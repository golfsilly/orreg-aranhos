"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Fingerprint, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const signInSchema = z.object({ identity: z.string().trim().min(1), password: z.string().min(1) });
type SignInValues = z.infer<typeof signInSchema>;

export function SignInForm({ providerOnly = false, providerEnabled, providerError = false }: { providerOnly?: boolean; providerEnabled: boolean; providerError?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState(providerError ? "ไม่สามารถเข้าสู่ระบบด้วย Provider ID ได้ กรุณาติดต่อผู้ดูแลระบบ" : "");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { identity: "", password: "" } });
  async function provider() {
    setPending(true); setError("");
    try {
      const result = await authClient.signIn.social({ provider: "moph-provider-id", callbackURL: "/dashboard", errorCallbackURL: providerOnly ? "/signin?error=provider" : "/auth/signin?error=provider" });
      if (result.error) { setError("ไม่สามารถเชื่อมต่อ Provider ID ได้ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ"); setPending(false); }
    } catch { setError("ไม่สามารถเชื่อมต่อ Provider ID ได้ กรุณาลองใหม่"); setPending(false); }
  }
  async function submit(values: SignInValues) {
    setPending(true); setError("");
    const identity = values.identity.toLowerCase(), password = values.password;
    try {
      const result = identity.includes("@") ? await authClient.signIn.email({ email: identity, password, callbackURL: "/dashboard" }) : await authClient.signIn.username({ username: identity, password, callbackURL: "/dashboard" });
      if (result.error) setError("ชื่อผู้ใช้ อีเมล หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีไม่พร้อมใช้งาน");
      else { router.replace("/dashboard"); router.refresh(); }
    } catch { setError("ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง"); }
    finally { setPending(false); }
  }
  return <div><div className="mb-7 flex size-14 items-center justify-center rounded-[18px] bg-secondary text-primary"><Fingerprint className="size-7" /></div><p className="mb-2 text-xs font-bold tracking-[0.18em] text-primary">WELCOME TO SURGIS</p><h1 className="text-[32px] leading-tight font-semibold tracking-tight text-foreground sm:text-[38px]">เข้าสู่ระบบ</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">{providerOnly ? "ยืนยันตัวตนด้วย Provider ID เพื่อเข้าสู่ระบบ" : "ยินดีต้อนรับกลับ กรุณายืนยันตัวตนเพื่อใช้งาน"}</p>
    <div className="mt-8"><Button type="button" onClick={provider} disabled={!providerEnabled || pending} className="h-14 w-full rounded-xl border border-border bg-card px-3 text-foreground shadow-[0_5px_20px_#234c3a09] hover:bg-accent sm:px-4"><span className="grid h-9 w-[76px] shrink-0 place-items-center rounded-lg bg-white px-1.5"><Image src="/provider-id/providerId.png" alt="" width={76} height={33} className="h-full w-full object-contain" /></span><span className="min-w-0 flex-1 text-center text-xs sm:text-sm">{pending ? "กำลังดำเนินการ…" : "เข้าสู่ระบบด้วย Provider ID"}</span><ArrowRight className="size-4 shrink-0" /></Button>{!providerEnabled && <p className="mt-3 text-xs leading-5 text-muted-foreground">Provider ID ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ</p>}</div>
    {!providerOnly && <><div className="my-7 flex items-center gap-4 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /> หรือเข้าสู่ระบบด้วยบัญชีผู้ใช้ <span className="h-px flex-1 bg-border" /></div><form onSubmit={form.handleSubmit(submit)} className="space-y-5"><label className="block text-sm font-semibold text-foreground">ชื่อผู้ใช้หรืออีเมล<input {...form.register("identity")} autoComplete="username" required className="mt-2 block h-13 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none transition placeholder:text-muted-foreground/65 focus:border-ring focus:ring-4 focus:ring-ring/20" placeholder="กรอกชื่อผู้ใช้หรืออีเมล" /></label><label className="block text-sm font-semibold text-foreground">รหัสผ่าน<span className="relative mt-2 block"><input {...form.register("password")} type={showPassword ? "text" : "password"} autoComplete="current-password" required className="block h-13 w-full rounded-xl border border-input bg-card px-4 pr-12 text-sm outline-none transition placeholder:text-muted-foreground/65 focus:border-ring focus:ring-4 focus:ring-ring/20" placeholder="กรอกรหัสผ่าน" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} className="absolute inset-y-0 right-0 px-4 text-muted-foreground">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></label>{Object.keys(form.formState.errors).length > 0 && <p role="alert" className="text-sm text-destructive">กรุณากรอกชื่อผู้ใช้หรืออีเมลและรหัสผ่าน</p>}<div className="text-right"><Link href="/auth/forgot-password" className="text-sm font-semibold text-primary hover:underline">ลืมรหัสผ่าน?</Link></div><Button type="submit" disabled={pending} className="h-14 w-full rounded-xl bg-primary shadow-[0_8px_20px_#176d5b25] hover:bg-primary/90"><LockKeyhole className="size-4" /> {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</Button></form></>}
    {error && <p role="alert" className="mt-5 rounded-xl bg-destructive/10 p-4 text-sm leading-6 text-destructive">{error}</p>}
    <p className="mt-8 text-center text-xs leading-6 text-muted-foreground">{providerOnly ? <>ต้องการใช้บัญชีผู้ใช้? <Link className="font-semibold text-primary hover:underline" href="/auth/signin">เข้าสู่ระบบด้วยรหัสผ่าน</Link></> : "หากยังไม่มีสิทธิ์ใช้งาน กรุณาติดต่อผู้ดูแลระบบ"}</p>
  </div>;
}
