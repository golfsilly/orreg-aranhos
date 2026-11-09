"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDownRight, ArrowRight, Fingerprint, MoveUpRight } from "lucide-react";
import { OperatingRoomViewer } from "./operating-room-viewer";

export function HomeHero() {
  const reducedMotion = useReducedMotion();
  const reveal = { initial: { opacity: 0, y: reducedMotion ? 0 : 18 }, animate: { opacity: 1, y: 0 } };

  return <section className="grid items-center gap-8 pb-12 pt-5 sm:gap-10 sm:pb-16 sm:pt-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-6 lg:pb-20 lg:pt-9 xl:gap-10">
    <div className="relative z-10 min-w-0 pb-2 lg:py-10">
      <motion.div {...reveal} transition={{ duration: 0.65 }} className="inline-flex items-center gap-2.5 text-[10px] font-semibold tracking-[0.16em] text-primary sm:text-[11px]"><span className="h-px w-7 bg-primary/60" />CONNECTED CARE. SHARED PRECISION.</motion.div>
      <motion.h1 {...reveal} transition={{ duration: 0.7, delay: 0.08 }} className="mb-0 mt-5 text-[clamp(2.6rem,5.2vw,4.65rem)] leading-[1.2] font-semibold tracking-[-0.055em] sm:mt-6">ทุกการผ่าตัด<br /><span className="relative inline-block text-primary">เชื่อมถึงกัน<svg aria-hidden="true" viewBox="0 0 390 15" className="absolute -bottom-2 left-0 h-3 w-full text-[#9ebc89] dark:text-[#608f62]"><path d="M3 11C98 1 228 1 385 8" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" /></svg></span></motion.h1>
      <motion.p {...reveal} transition={{ duration: 0.7, delay: 0.16 }} className="mb-0 mt-8 max-w-md text-sm leading-7 text-muted-foreground sm:mt-9 sm:text-base sm:leading-8">พื้นที่ทำงานสำหรับทีมผ่าตัด<br className="hidden sm:block" />เชื่อมข้อมูลจาก HOSxP สู่ทะเบียนดิจิทัล<br className="hidden xl:block" />ที่บันทึก ติดตาม และส่งต่อข้อมูลได้อย่างเป็นระบบ</motion.p>
      <motion.div {...reveal} transition={{ duration: 0.7, delay: 0.24 }} className="mt-7 flex flex-wrap items-center gap-4 sm:mt-8 sm:gap-5"><Link href="/signin" className="group inline-flex h-13 items-center gap-7 rounded-2xl bg-[#1c533b] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_#1c533b90] transition hover:-translate-y-0.5 hover:bg-[#234e39] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring dark:bg-primary dark:text-primary-foreground">เข้าสู่ OR-Reg<span className="grid size-7 place-items-center rounded-lg bg-white/10"><ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span></Link><a href="#operating-theatre" className="group inline-flex items-center gap-2 text-xs font-semibold text-foreground underline-offset-4 hover:underline sm:text-sm">สำรวจห้องผ่าตัด<ArrowDownRight className="size-3.5 text-primary transition-transform group-hover:translate-y-0.5" /></a></motion.div>
      <motion.div {...reveal} transition={{ duration: 0.7, delay: 0.32 }} className="mt-7 flex items-center gap-2 text-[11px] text-muted-foreground sm:mt-8"><Fingerprint className="size-4 text-primary/70" /><span>เข้าใช้งานผ่าน Provider ID สำหรับบุคลากรที่ได้รับสิทธิ์</span></motion.div>
      <motion.div {...reveal} transition={{ duration: 0.7, delay: 0.4 }} className="mt-9 flex max-w-md items-center gap-4 border-t border-border/80 pt-5 sm:mt-12 sm:gap-7">{[{ number: "01", label: "เชื่อมข้อมูล" }, { number: "02", label: "บันทึกทะเบียน" }, { number: "03", label: "พร้อมรายงาน" }].map((item, index) => <div key={item.number} className="flex flex-1 items-start justify-between gap-2"><div><span className="block font-mono text-[10px] text-primary/65">{item.number}</span><span className="mt-1.5 block whitespace-nowrap text-[11px] font-medium text-foreground sm:text-xs">{item.label}</span></div>{index < 2 && <MoveUpRight aria-hidden="true" className="mt-1 size-3 text-muted-foreground/35" />}</div>)}</motion.div>
    </div>
    <OperatingRoomViewer />
  </section>;
}
