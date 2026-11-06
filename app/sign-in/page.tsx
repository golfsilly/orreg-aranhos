"use client";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function SignIn() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await authClient.signIn.email({ email: String(form.get("email")), password: String(form.get("password")), callbackURL: "/dashboard" });
      if (result.error) setError("ไม่สามารถเข้าสู่ระบบได้ โปรดตรวจสอบข้อมูลอีกครั้ง");
    } catch { setError("ไม่สามารถเชื่อมต่อระบบได้ โปรดลองอีกครั้ง"); }
    finally { setPending(false); }
  }
  return <main className="min-h-screen bg-[#f4f8f5] bg-[radial-gradient(circle_at_85%_12%,#dcefe6,transparent_34%)] px-6 py-10"><div className="mx-auto max-w-[1100px]"><Link href="/" className="text-sm text-[#427b6f] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]">← กลับหน้าหลัก</Link><div className="mx-auto my-[90px] max-w-[460px] rounded-[20px] border border-[#dcebe3] bg-white p-9 shadow-[0_18px_55px_#234f3910] max-[600px]:my-[60px] max-[600px]:p-6 [&_h1]:mb-1 [&_h1]:text-[30px] [&_button[type=submit]]:w-full"><span className="text-[11px] font-bold tracking-[0.2em] text-[#4c887a]">SURGIS ARANHOS</span><h1 className="mt-5 mb-3 text-[clamp(38px,6vw,66px)] leading-[1.2] font-bold tracking-[-0.03em]">เข้าสู่ระบบ</h1><p className="leading-[1.8] text-[#65817c]">สำหรับบุคลากรที่ได้รับสิทธิ์ใช้งาน</p><form onSubmit={submit}><label className="mt-5 block text-sm font-bold">อีเมล<input className="mt-2 block w-full rounded-lg border border-[#cbded4] p-[13px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]" name="email" type="email" autoComplete="username" required /></label><label className="mt-5 block text-sm font-bold">รหัสผ่าน<input className="mt-2 block w-full rounded-lg border border-[#cbded4] p-[13px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]" name="password" type="password" autoComplete="current-password" required /></label>{error && <p className="text-sm text-[#a33a36]" role="alert">{error}</p>}<button className="mt-[22px] inline-flex cursor-pointer items-center justify-center gap-8 rounded-[10px] border-0 bg-[#166c5e] px-5 py-[15px] font-bold text-white no-underline hover:bg-[#10584d] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50" disabled={pending}>{pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button></form></div></div></main>;
}
