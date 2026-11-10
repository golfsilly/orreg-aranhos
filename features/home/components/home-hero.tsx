"use client";

import { ArrowRight, Fingerprint } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { OperatingRoomViewer } from "./operating-room-viewer";

export function HomeHero() {
  const reducedMotion = useReducedMotion();
  const { data: session, isPending } = authClient.useSession();
  const reveal = {
    initial: { opacity: 0, y: reducedMotion ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <section className="grid items-center gap-8 pb-12 pt-9 sm:gap-10 sm:pb-16 sm:pt-12 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-10 lg:pb-20 lg:pt-14">
      <div className="relative z-10 min-w-0 lg:py-8">
        <motion.div
          {...reveal}
          transition={{ duration: 0.55 }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.045] px-3 py-1.5 text-[9px] font-semibold tracking-[0.13em] text-primary sm:text-[10px]"
        >
          <span className="size-1.5 rounded-full bg-primary" />
          OR-REG · OPERATING ROOM REGISTER
        </motion.div>

        <motion.h1
          {...reveal}
          transition={{ duration: 0.6, delay: 0.06 }}
          className="mb-0 mt-6 max-w-xl text-[clamp(2.35rem,5vw,4.25rem)] leading-[1.18] font-semibold tracking-[-0.055em]"
        >
          ทุกการผ่าตัด
          <br />
          <span className="text-primary">เชื่อมถึงกัน</span>
        </motion.h1>

        <motion.p
          {...reveal}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mb-0 mt-5 max-w-lg text-sm leading-7 text-muted-foreground sm:mt-6 sm:text-base sm:leading-8"
        >
          พื้นที่ทำงานของทีมผ่าตัด เชื่อมข้อมูลจาก HOSxP เข้ากับทะเบียนดิจิทัล
          การติดตาม และรายงานในระบบเดียว
        </motion.p>

        <motion.div
          {...reveal}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mt-7 flex flex-wrap items-center gap-3 sm:mt-8"
        >
          {isPending ? (
            <Skeleton
              role="status"
              aria-label="กำลังตรวจสอบบัญชี"
              className="h-12 w-36 rounded-xl"
            />
          ) : (
            <Link
              href={session?.user ? "/dashboard" : "/signin"}
              className="group inline-flex h-12 items-center gap-4 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_8px_22px_-13px_var(--primary)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-13px_var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              {session?.user ? "เข้าสู่พื้นที่ทำงาน" : "เข้าสู่ระบบ"}
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          )}
          <a
            href="#operating-theatre"
            className="inline-flex h-12 items-center gap-2 rounded-xl px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted/70 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            สำรวจห้องผ่าตัด 3D
          </a>
        </motion.div>

        <motion.div
          {...reveal}
          transition={{ duration: 0.6, delay: 0.24 }}
          className="mt-7 flex items-start gap-2.5 border-t border-border/70 pt-4 text-[11px] leading-5 text-muted-foreground sm:mt-9"
        >
          <Fingerprint
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-primary/80"
          />
          <span>
            เข้าใช้งานผ่าน Provider ID
            <span className="text-muted-foreground/70">
              {" "}
              สำหรับบุคลากรที่ได้รับสิทธิ์
            </span>
          </span>
        </motion.div>
      </div>

      <OperatingRoomViewer />
    </section>
  );
}
