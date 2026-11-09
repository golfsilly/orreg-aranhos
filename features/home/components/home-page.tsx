import { ThemeToggle } from "@/components/theme-toggle";
import { ChartNoAxesCombined, ClipboardList, Link2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HomeHero } from "./home-hero";
import { HomeAccountButton } from "./home-account-button";
import { BRAND } from "@/lib/brand";

const capabilities = [
  { number: "01", icon: Link2, title: "ข้อมูลที่เชื่อมถึงกัน", subtitle: "CONNECTED INFORMATION", description: "ดึงข้อมูลผู้ป่วย รายการผ่าตัด และทีมบุคลากรจาก HOSxP เพื่อทำงานต่อได้ในพื้นที่เดียว" },
  { number: "02", icon: ClipboardList, title: "ทะเบียนที่เป็นระบบ", subtitle: "A CLEARER WORKFLOW", description: "จัดเลขทะเบียนแยกตามแผนกและเดือน บันทึกเวลา การเยี่ยมผู้ป่วย และรายละเอียดเพิ่มเติมได้สะดวก" },
  { number: "03", icon: ChartNoAxesCombined, title: "ภาพรวมที่มองเห็น", subtitle: "INFORMATION INTO INSIGHT", description: "ติดตามสถิติการผ่าตัด และส่งออกทะเบียนเป็น PDF หรือ Excel สำหรับงานรายงานของทีม" },
];

export function HomePage() {
  return <main className="relative min-h-screen overflow-x-clip bg-background text-foreground">
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[850px] bg-[radial-gradient(ellipse_at_80%_30%,#b4cca51a,transparent_60%)] dark:bg-[radial-gradient(ellipse_at_80%_30%,#4d7f3d15,transparent_60%)]" />
    <div className="relative mx-auto w-full max-w-[1520px] px-5 sm:px-8 lg:px-10 xl:px-16">
      <header className="flex h-22 items-center justify-between gap-4 border-b border-border/60 sm:h-25">
        <Link href="/" aria-label={`${BRAND.name} หน้าหลัก`} className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-3"><span className="grid size-10 place-items-center rounded-[13px] border border-border/60 bg-white p-1 shadow-sm sm:size-11"><Image src={BRAND.logoPath} alt="" width={44} height={44} priority className="size-full object-contain" /></span><span><span className="block text-[15px] font-bold tracking-[0.14em]">{BRAND.wordmark}</span><span className="mt-0.5 block text-[8px] font-semibold tracking-[0.25em] text-muted-foreground max-[360px]:hidden">ARANYAPRATHET HOSPITAL</span></span></Link>
        <nav aria-label="เมนูหน้าหลัก" className="flex shrink-0 items-center gap-2.5 sm:gap-5">
          <a href="#workspace" className="hidden text-xs font-medium text-muted-foreground transition hover:text-foreground md:block">รู้จัก {BRAND.name}</a>
          <span className="hidden h-4 w-px bg-border md:block" />
          <ThemeToggle />
          <HomeAccountButton />
        </nav>
      </header>
      <HomeHero />
      <section id="workspace" aria-labelledby="workspace-title" className="border-t border-border/80 pb-12 pt-9 sm:pb-16 sm:pt-12">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:mb-9 md:flex-row md:items-end"><div><p className="m-0 text-[10px] font-semibold tracking-[0.18em] text-primary">ONE CONNECTED WORKSPACE</p><h2 id="workspace-title" className="mb-0 mt-2.5 text-xl font-semibold tracking-tight sm:text-2xl">ทุกบทบาท ทำงานต่อกันได้</h2></div><p className="m-0 max-w-sm text-xs leading-6 text-muted-foreground sm:text-sm">จากข้อมูลต้นทางสู่ทะเบียนดิจิทัล<br className="hidden sm:block" />ออกแบบให้ทีมผ่าตัดใช้งานร่วมกันในแต่ละวัน</p></div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 sm:gap-4">{capabilities.map(({ number, icon: Icon, title, subtitle, description }) => <article key={number} className="group rounded-[22px] border border-border/80 bg-card/75 p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_12px_32px_-24px_#176c5055] sm:p-6"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-primary/[0.07] text-primary"><Icon className="size-[19px]" /></span><span className="font-mono text-[11px] text-muted-foreground/55">{number}</span></div><p className="mb-0 mt-5 text-[8px] font-semibold tracking-[0.16em] text-muted-foreground">{subtitle}</p><h3 className="mb-0 mt-1.5 text-base font-semibold tracking-tight">{title}</h3><p className="mb-0 mt-2.5 text-xs leading-6 text-muted-foreground sm:text-[13px]">{description}</p></article>)}</div>
      </section>
      <footer className="flex flex-col justify-between gap-4 border-t border-border/80 py-6 sm:flex-row sm:items-center sm:py-7">
        <div className="flex items-center gap-3"><Image src="/aranhos-logo/logo-aranhos.png" alt="โรงพยาบาลอรัญประเทศ" width={32} height={32} className="size-8 object-contain" /><span className="h-6 w-px bg-border" /><Image src="/moph-logo/moph-logo.png" alt="กระทรวงสาธารณสุข" width={28} height={32} className="h-8 w-7 object-contain" /><span className="ml-1 text-[10px] leading-5 text-muted-foreground"><strong className="block text-xs font-semibold text-foreground">โรงพยาบาลอรัญประเทศ</strong>Aranyaprathet Hospital</span></div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary/65" />ระบบสำหรับบุคลากรที่ได้รับสิทธิ์</span><span>{BRAND.wordmark}</span></div>
      </footer>
    </div>
  </main>;
}
