"use client";

import { Activity, BellRing, CheckCircle2, Clock3, ImageIcon, KeyRound, PauseCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import { monitorErrorLabel, type MonitorHealth, type MonitorResponse } from "@/lib/notifications/monitor-contract";

export function monitorTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok", hourCycle: "h23" }).format(new Date(value)) : "ยังไม่มีข้อมูล";
}
const healthLabels: Record<MonitorHealth, { title: string; detail: string }> = {
  ACTIVE: { title: "ตัวตรวจทำงานอยู่", detail: "พบรอบทำงานล่าสุดภายใน 8 นาที ตรวจรายการใหม่ทุก 3 นาที" },
  DISABLED: { title: "ปิดการส่งอัตโนมัติ", detail: "ตัวส่งถูกปิดในการตั้งค่า โหมดพัฒนาจะปิดเป็นค่าเริ่มต้น" },
  UNCONFIGURED: { title: "ยังตั้งค่า MOPH ไม่ครบ", detail: "ตรวจ client key และ secret key ของกลุ่มบนเครื่องที่รันระบบ" },
  WAITING: { title: "รอรอบทำงานแรก", detail: "ยังยืนยันการทำงานไม่ได้ รอรอบตรวจหลังอัปเดต migration และเริ่มเซิร์ฟเวอร์" },
  PAUSED: { title: "พักการส่ง · ต้องตรวจสอบ", detail: "ตัวส่งหยุดไว้เพื่อป้องกันแจ้งซ้ำ ตรวจผลในกลุ่มก่อนเปิดทำงานต่อ" },
  SENDING: { title: "กำลังดำเนินการส่ง", detail: "มีรอบส่งที่ยังไม่สิ้นสุด รายการยังไม่ถือว่าสำเร็จจนกว่า MOPH จะตอบรับ" },
  STALE: { title: "ไม่พบรอบทำงานล่าสุด", detail: "รอบตรวจห่างเกิน 8 นาที หรือเวลาเซิร์ฟเวอร์ไม่ตรง กรุณาตรวจ Node service / PM2" },
  CHECK_FAILED: { title: "รอบตรวจมีข้อผิดพลาด", detail: "ตัวตรวจยังส่งสัญญาณทำงาน แต่รอบล่าสุดอ่านข้อมูลหรือดำเนินการไม่สำเร็จ" },
};

export function MonitorOverview({ data }: { data: MonitorResponse }) {
  const health = healthLabels[data.health];
  const good = data.health === "ACTIVE";
  const attention = ["PAUSED", "STALE", "CHECK_FAILED", "UNCONFIGURED"].includes(data.health);
  const error = data.cursor?.lastCheckErrorCode || (data.health === "PAUSED" ? data.cursor?.lastErrorCode : null);
  return <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <section className={`relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-6 ${attention ? "border-amber-500/30" : "border-border"}`} aria-label="สถานะตัวแจ้งเตือน">
        <div className={`absolute inset-y-0 left-0 w-1 ${good ? "bg-primary" : attention ? "bg-amber-500" : "bg-muted-foreground/30"}`} />
        <div className="flex items-start justify-between gap-3"><span className={`grid size-10 place-items-center rounded-xl ${good ? "bg-primary/10 text-primary" : attention ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>{good ? <Activity className="size-5" /> : data.health === "PAUSED" ? <PauseCircle className="size-5" /> : <BellRing className="size-5" />}</span><span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">SET OR · MOPH Notify</span></div>
        <div className="mt-4 flex items-center gap-2"><span className={`size-2 shrink-0 rounded-full ${good ? "bg-primary" : attention ? "bg-amber-500" : "bg-muted-foreground/50"}`} /><h2 className="text-lg font-semibold tracking-tight sm:text-xl">{health.title}</h2></div>
        <p className="mt-2 max-w-xl text-xs leading-6 text-muted-foreground">{health.detail}</p>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-3.5 shrink-0" />รอบทำงานล่าสุด <span className="font-medium text-foreground">{monitorTime(data.cursor?.lastCheckedAt ?? null)}</span></p>
        {error && <p className="mt-3 rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-2 text-xs leading-5 text-amber-900 dark:text-amber-200">{monitorErrorLabel(error)}<span className="mt-1 block break-all font-mono text-[10px] opacity-70">{error}</span></p>}
      </section>
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-label="การตั้งค่าและผลการส่งล่าสุด">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-primary" />ความพร้อมของการส่ง</h2>
        <dl className="divide-y divide-border/60 text-xs">
          <div className="flex items-center justify-between gap-3 py-3 first:pt-0"><dt className="flex items-center gap-2 text-muted-foreground"><KeyRound className="size-3.5" />คีย์กลุ่ม MOPH</dt><dd className={data.configured ? "font-medium text-primary" : "text-muted-foreground"}>{data.configured ? "ตั้งค่าแล้ว" : "ยังไม่ครบ"}</dd></div>
          <div className="flex items-center justify-between gap-3 py-3"><dt className="flex items-center gap-2 text-muted-foreground"><ImageIcon className="size-3.5" />URL โลโก้</dt><dd className={data.logoConfigured ? "font-medium text-primary" : "text-muted-foreground"}>{data.logoConfigured ? "ตั้งค่าแล้ว" : "ใช้ตัวอักษร OR"}</dd></div>
          <div className="flex items-center justify-between gap-3 py-3"><dt className="text-muted-foreground">รหัสต้นทางที่ติดตามถึง</dt><dd className="font-mono font-semibold tabular-nums">{data.cursor?.operationId ?? "—"}</dd></div>
          <div className="flex flex-wrap items-start justify-between gap-2 pt-3"><dt className="text-muted-foreground">ตอบรับสำเร็จล่าสุดในช่วงนี้</dt><dd className="font-medium">{monitorTime(data.lastSentAt)}</dd></div>
        </dl>
      </section>
    </div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[
      { label: "รายการในช่วงที่เลือก", value: data.counts.total, icon: BellRing, tone: "text-foreground" },
      { label: "MOPH ตอบรับแล้ว", value: data.counts.sent, icon: CheckCircle2, tone: "text-primary" },
      { label: "ต้องตรวจสอบผลส่ง", value: data.counts.review, icon: TriangleAlert, tone: "text-amber-700 dark:text-amber-300" },
      { label: "เริ่มส่ง / ยังไม่ยืนยัน", value: data.counts.claimed, icon: Clock3, tone: "text-muted-foreground" },
    ].map((item) => <div key={item.label} className="rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="flex items-start justify-between gap-2"><p className="text-xs leading-5 text-muted-foreground">{item.label}</p><item.icon className={`size-4 shrink-0 ${item.tone}`} /></div><p className={`mt-3 text-2xl font-semibold tabular-nums sm:text-3xl ${item.tone}`}>{item.value.toLocaleString("th-TH")}</p></div>)}</div>
  </div>;
}
