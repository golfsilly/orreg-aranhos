"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, ChevronRight, RefreshCw, Search, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { monitorResponseSchema, type MonitorQuery } from "@/lib/notifications/monitor-contract";
import { MonitorOverview, monitorTime } from "./monitor-overview";
import { NotificationHistory } from "./notification-history";
import { NotificationHistorySkeleton, NotificationOverviewSkeleton } from "./notification-monitor-skeleton";

const searchSchema = z.object({ q: z.string().trim().max(19, "รหัสยาวเกินกำหนด").regex(/^\d*$/, "กรอกเฉพาะตัวเลขรหัส HOSxP") });
const filterClass = "h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/20";

export function NotificationMonitor() {
  const [filters, setFilters] = useState<MonitorQuery>({ days: "7", status: "ALL", q: "", page: 1, pageSize: "10" });
  const form = useForm<z.infer<typeof searchSchema>>({ resolver: zodResolver(searchSchema), defaultValues: { q: "" } });
  const searchValue = useWatch({ control: form.control, name: "q" });
  const update = (next: Partial<MonitorQuery>) => setFilters((value) => ({ ...value, ...next, page: 1 }));
  const query = useQuery({
    queryKey: ["notification-monitor", filters],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)]));
      const response = await fetch(`/api/admin/notifications?${params}`, { signal, cache: "no-store" });
      if (response.status === 403) throw new Error("บัญชีนี้ไม่มีสิทธิ์ดูสถานะแจ้งเตือน");
      if (!response.ok) throw new Error("โหลดสถานะไม่สำเร็จ กรุณาตรวจฐานข้อมูลและ migration หรือลองใหม่");
      const parsed = monitorResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("รูปแบบข้อมูลสถานะไม่ถูกต้อง กรุณาลองใหม่");
      return parsed.data;
    },
    refetchInterval: 30000, refetchIntervalInBackground: false, gcTime: 0, staleTime: 0,
  });
  const data = query.data;
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / Number(filters.pageSize)));
  async function refresh() {
    const result = await query.refetch();
    if (!result.isError) toast.success("อัปเดตสถานะแจ้งเตือนแล้ว");
  }
  return <div className="mx-auto w-full max-w-7xl space-y-5 pb-2">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-[10px] font-bold tracking-[0.18em] text-primary">NOTIFICATION MONITOR</p><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">ศูนย์แจ้งเตือน</h1><span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium text-muted-foreground"><ShieldCheck className="size-3" />Superadmin</span></div><p className="mt-2 max-w-xl text-xs leading-6 text-muted-foreground sm:text-sm">ติดตามการทำงานของ Set OR และตรวจสอบว่าแจ้งเตือนเคสใดไปแล้ว ดูย้อนหลังได้สูงสุด 7 วัน</p></div><Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={query.isFetching} className="self-start border border-border bg-card sm:self-auto"><RefreshCw className={`size-3.5 ${query.isFetching ? "animate-spin motion-reduce:animate-none" : ""}`} />อัปเดตสถานะ</Button></header>
    {query.isError ? <div role="alert" className="flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-5"><TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" /><div><p className="text-sm font-semibold">ยังยืนยันสถานะปัจจุบันไม่ได้</p><p className="mt-1 text-xs leading-6 text-muted-foreground">{query.error.message}</p><p className="mt-1 text-xs leading-6 text-muted-foreground">กรุณาอัปเดตอีกครั้งเพื่อดูสถานะล่าสุด</p></div></div> : data ? <MonitorOverview data={data} /> : <NotificationOverviewSkeleton />}
    <section className="overflow-hidden rounded-2xl border border-border bg-card" aria-label="ประวัติส่งแจ้งเตือน">
      <div className="space-y-4 border-b border-border p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-sm font-semibold">ประวัติการส่งรายเคส</h2><p className="mt-1 text-[11px] leading-5 text-muted-foreground">เรียงตามเวลาเริ่มดำเนินการล่าสุด · เวลาไทย · อัปเดตอัตโนมัติทุก 30 วินาที</p></div>{data && !query.isError && <p className="text-[10px] leading-5 text-muted-foreground">ข้อมูล ณ {monitorTime(data.generatedAt)}</p>}</div>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-wrap items-center gap-2"><div role="group" aria-label="ช่วงเวลาประวัติแจ้งเตือน" className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-muted/30 p-1">{(["1", "3", "7"] as const).map((days) => <Button key={days} variant="ghost" size="sm" aria-pressed={filters.days === days} onClick={() => update({ days })} className={`h-8 rounded-lg px-3 text-xs font-medium ${filters.days === days ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground"}`}>{days} วัน</Button>)}</div><label className="sr-only" htmlFor="notification-status">สถานะการส่ง</label><select id="notification-status" className={filterClass} value={filters.status} onChange={(e) => update({ status: e.target.value as MonitorQuery["status"] })}><option value="ALL">ทุกสถานะ</option><option value="SENT">MOPH ตอบรับแล้ว</option><option value="REVIEW">ต้องตรวจสอบ</option><option value="CLAIMED">ยังไม่ยืนยันผล</option></select></div>
          <form className="w-full xl:max-w-sm" onSubmit={form.handleSubmit(({ q }) => update({ q }))}><div className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" /><input aria-label="ค้นหารหัส HOSxP" placeholder="ค้นหารหัส HOSxP" inputMode="numeric" autoComplete="off" {...form.register("q")} className={`${filterClass} w-full pr-9 pl-9`} aria-invalid={Boolean(form.formState.errors.q)} aria-describedby={form.formState.errors.q ? "notification-search-error" : undefined} />{(filters.q || searchValue) && <button type="button" aria-label="ล้างการค้นหา" className="absolute top-2 right-2 grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted" onClick={() => { form.reset({ q: "" }); update({ q: "" }); }}><X className="size-3.5" /></button>}</div><Button type="submit" size="sm" className="h-10 rounded-xl px-4">ค้นหา</Button></div>{form.formState.errors.q && <p id="notification-search-error" className="mt-1 text-xs text-destructive">{form.formState.errors.q.message}</p>}</form>
        </div>
        {data && !query.isError && <p className="text-[11px] leading-5 text-muted-foreground">{monitorTime(data.windowStart)} – {monitorTime(data.windowEnd)}{filters.q && <> · รหัสที่ค้นหา {filters.q}</>}</p>}
      </div>
      {data && !query.isError && !data.sourceAvailable && <div role="status" className="border-b border-amber-500/15 bg-amber-500/5 px-4 py-3 text-xs leading-6 text-amber-900 sm:px-5 dark:text-amber-200">อ่านข้อมูลผู้ป่วยจาก HOSxP ไม่สำเร็จ จึงแสดงเฉพาะรหัสและผลส่งที่บันทึกไว้ สถานะการส่งเดิมยังคงอยู่</div>}
      {query.isError ? <p className="px-5 py-12 text-center text-sm text-muted-foreground">โหลดประวัติไม่ได้ กดอัปเดตสถานะเพื่อลองอีกครั้ง</p> : data ? <NotificationHistory rows={data.rows} /> : <NotificationHistorySkeleton />}
      {data && !query.isError && <nav aria-label="แบ่งหน้าประวัติแจ้งเตือน" className="flex flex-col items-center justify-between gap-3 border-t border-border bg-muted/15 px-4 py-4 sm:flex-row sm:px-5"><p className="text-xs text-muted-foreground">พบ {data.total.toLocaleString("th-TH")} รายการ · หน้า {filters.page.toLocaleString("th-TH")} / {pageCount.toLocaleString("th-TH")}</p><div className="flex flex-wrap items-center justify-center gap-2"><label className="flex items-center gap-2 text-xs text-muted-foreground">แสดง<select className={`${filterClass} h-9`} value={filters.pageSize} onChange={(e) => update({ pageSize: e.target.value as MonitorQuery["pageSize"] })}>{["10", "20", "50"].map((size) => <option key={size} value={size}>{size}</option>)}</select>รายการ</label><Button variant="ghost" size="sm" className="h-9 border border-border bg-card" disabled={filters.page <= 1 || query.isFetching} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}><ChevronLeft className="size-3.5" />ก่อนหน้า</Button><Button variant="ghost" size="sm" className="h-9 border border-border bg-card" disabled={filters.page >= pageCount || query.isFetching} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>ถัดไป<ChevronRight className="size-3.5" /></Button></div></nav>}
    </section>
    <p className="px-1 text-[11px] leading-6 text-muted-foreground">“ตอบรับแล้ว” หมายถึง MOPH ตอบรับ หรือมีการตรวจยืนยันผลส่งแล้ว ไม่ได้ยืนยันว่าเจ้าหน้าที่เปิดอ่านข้อความ ชื่อและ HN อ่านจาก HOSxP ณ เวลาที่เปิดดู หน้านี้ไม่มีการส่งซ้ำหรือปลดพักอัตโนมัติ</p>
  </div>;
}
