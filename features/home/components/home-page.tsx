import { ThemeToggle } from "@/components/theme-toggle";
import { BRAND } from "@/lib/brand";
import { ChartNoAxesCombined, ClipboardList, Link2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HomeAccountButton } from "./home-account-button";
import { HomeHero } from "./home-hero";

const workflows = [
  {
    number: "01",
    icon: Link2,
    label: "CONNECTED DATA",
    title: "ข้อมูลจาก HOSxP",
    description:
      "เชื่อมข้อมูลผู้ป่วย รายการผ่าตัด และทีมบุคลากร เพื่อใช้ประกอบการทำงาน",
  },
  {
    number: "02",
    icon: ClipboardList,
    label: "DIGITAL REGISTER",
    title: "ทะเบียนที่เป็นระบบ",
    description:
      "จัดทะเบียนแยกตามแผนกและเดือน พร้อมบันทึกข้อมูลเพิ่มเติมได้ในที่เดียว",
  },
  {
    number: "03",
    icon: ChartNoAxesCombined,
    label: "REPORTS & INSIGHTS",
    title: "ติดตามและสรุปผล",
    description:
      "ดูปฏิทิน สถิติ และรายงาน พร้อมส่งออกข้อมูลสำหรับการทำงานของทีม",
  },
];

export function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(ellipse_at_78%_12%,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_58%)] dark:bg-[radial-gradient(ellipse_at_78%_12%,color-mix(in_oklab,var(--primary)_5%,transparent),transparent_58%)]"
      />
      <div className="relative mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-10 xl:px-14">
        <header className="flex h-[72px] items-center justify-between gap-4 border-b border-border/65 sm:h-20">
          <Link
            href="/"
            aria-label={`${BRAND.name} หน้าหลัก`}
            className="flex min-w-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-3"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border/70 bg-white p-1 shadow-sm sm:size-11">
              <Image
                src={BRAND.logoPath}
                alt=""
                width={44}
                height={44}
                priority
                className="size-full object-contain"
              />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold tracking-[0.13em] sm:text-[15px]">
                {BRAND.wordmark}
              </span>
              <span className="mt-0.5 block truncate text-[8px] font-medium tracking-[0.13em] text-muted-foreground sm:text-[9px] sm:tracking-[0.2em]">
                ARANYAPRATHET HOSPITAL
              </span>
            </span>
          </Link>

          <nav
            aria-label="เมนูหน้าหลัก"
            className="flex shrink-0 items-center gap-2 sm:gap-4"
          >
            <Link
              href="#workflow"
              className="hidden rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:inline-flex"
            >
              ภาพรวมระบบ
            </Link>
            <span
              aria-hidden="true"
              className="hidden h-5 w-px bg-border md:block"
            />
            <ThemeToggle />
            <HomeAccountButton />
          </nav>
        </header>

        <HomeHero />

        <section
          id="workflow"
          aria-labelledby="workflow-title"
          className="border-t border-border/70 py-9 sm:py-12 lg:py-14"
        >
          <div className="mb-6 flex flex-col justify-between gap-3 sm:mb-8 sm:flex-row sm:items-end">
            <div>
              <p className="m-0 text-[9px] font-semibold tracking-[0.18em] text-primary sm:text-[10px]">
                ONE CONNECTED WORKSPACE
              </p>
              <h2
                id="workflow-title"
                className="mb-0 mt-2 text-xl font-semibold tracking-tight sm:text-2xl"
              >
                งานผ่าตัดในภาพเดียว
              </h2>
            </div>
            <p className="m-0 max-w-md text-xs leading-6 text-muted-foreground sm:text-right sm:text-sm">
              จากข้อมูลต้นทาง สู่ทะเบียนและรายงานที่ทีมใช้งานร่วมกัน
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3 sm:gap-4">
            {workflows.map(
              ({ number, icon: Icon, label, title, description }) => (
                <article
                  key={number}
                  className="group rounded-2xl border border-border/70 bg-card/55 p-4 transition-colors hover:border-primary/25 hover:bg-card/90 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-primary/[0.07] text-primary">
                      <Icon aria-hidden="true" className="size-[17px]" />
                    </span>
                    <span className="font-mono text-[10px] tracking-wide text-muted-foreground/60">
                      {number}
                    </span>
                  </div>
                  <p className="m-0 mt-4 text-[8px] font-semibold tracking-[0.15em] text-muted-foreground sm:text-[9px]">
                    {label}
                  </p>
                  <h3 className="m-0 mt-1 text-sm font-semibold tracking-tight sm:text-base">
                    {title}
                  </h3>
                  <p className="m-0 mt-2 text-xs leading-5 text-muted-foreground sm:leading-6">
                    {description}
                  </p>
                </article>
              ),
            )}
          </div>
        </section>

        <footer className="border-t border-border/70 py-5 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/aranhos-logo/logo-aranhos.png"
                alt="โรงพยาบาลอรัญประเทศ"
                width={30}
                height={30}
                className="size-[30px] object-contain"
              />
              <span aria-hidden="true" className="h-6 w-px bg-border" />
              <Image
                src="/moph-logo/moph-logo.png"
                alt="กระทรวงสาธารณสุข"
                width={26}
                height={30}
                className="h-[30px] w-[26px] object-contain"
              />
              <span className="ml-1">
                <span className="block text-[11px] font-semibold text-foreground">
                  โรงพยาบาลอรัญประเทศ
                </span>
                <span className="block text-[9px] text-muted-foreground">
                  Aranyaprathet Hospital
                </span>
              </span>
            </div>

            <div className="flex flex-col gap-0.5 text-[10px] leading-5 text-muted-foreground sm:items-end">
              <p className="m-0">
                Crafted by กลุ่มงานสุขภาพดิจิทัล โรงพยาบาลอรัญประเทศ
                <span className="font-medium text-foreground/85"></span>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
