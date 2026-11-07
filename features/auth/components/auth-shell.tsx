import { ThemeToggle } from "@/components/theme-toggle";
import { Activity, ArrowLeft, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[minmax(420px,0.9fr)_minmax(560px,1.1fr)]">
      <aside className="relative hidden min-h-screen overflow-hidden bg-[#103f38] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-48 -left-24 size-[560px] rounded-full bg-[#57b49b]/20 blur-[100px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -bottom-40 size-[540px] rounded-full border border-white/10 shadow-[0_0_0_64px_#ffffff05,0_0_0_128px_#ffffff04]"
        />
        <Link href="/" className="relative flex w-fit items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white p-1">
            <Image src="/surgis-logo/logo.png" alt="" width={44} height={44} className="size-full object-contain" />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-[0.18em]">
              SURGIS
            </span>
            <span className="block text-[10px] tracking-[0.2em] text-emerald-100/65">
              ARANHOS
            </span>
          </span>
        </Link>
        <div className="relative max-w-lg">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-100/15 bg-white/5 px-4 py-2 text-xs tracking-wide text-emerald-100/80">
            <Activity className="size-4" /> ระบบทะเบียนผ่าตัด
          </div>
          <h2 className="text-4xl leading-[1.35] font-semibold tracking-tight xl:text-5xl">
            ดูแลทุกการผ่าตัด
            <br />
            <span className="text-[#a7e1cd]">ด้วยข้อมูลที่เชื่อมโยงกัน</span>
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-7 text-emerald-50/70">
            พื้นที่ทำงานสำหรับบุคลากรห้องผ่าตัด โรงพยาบาลอรัญประเทศ
          </p>
        </div>
        <div className="relative flex items-center gap-3 border-t border-white/10 pt-7 text-xs text-emerald-50/60">
          <ShieldCheck className="size-5 text-[#9bd9c6]" />{" "}
          สำหรับบุคลากรที่ได้รับสิทธิ์เข้าใช้งาน
        </div>
      </aside>
      <section className="relative flex min-h-screen flex-col px-6 py-7 sm:px-12 lg:px-16">
        <div className="mx-auto flex w-full max-w-[480px] items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="size-4" /> หน้าหลัก
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground lg:hidden">
              SURGIS ARANHOS
            </span>
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-14">
          {children}
        </div>
        <div className="mx-auto flex w-full max-w-[440px] flex-col items-center gap-3 border-t border-border pt-5 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white p-1"><Image src="/aranhos-logo/logo-aranhos.png" alt="โลโก้โรงพยาบาลอรัญประเทศ" width={40} height={40} className="size-full object-contain" /></span>
            <span className="h-6 w-px bg-border" aria-hidden="true" />
            <span className="grid size-10 place-items-center rounded-xl bg-white p-1"><Image src="/moph-logo/moph-logo.png" alt="โลโก้กระทรวงสาธารณสุข" width={40} height={40} className="size-full object-contain" /></span>
          </div>
          <p>SURGIS ARANHOS · ระบบทะเบียนผ่าตัด</p>
        </div>
      </section>
    </main>
  );
}
