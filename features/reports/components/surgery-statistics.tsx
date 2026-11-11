"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs } from "@base-ui/react/tabs";
import { AlertCircle, ArrowUpRight, CalendarDays, Check, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThaiDatePicker } from "@/features/operations/components/shared/thai-date-picker";
import { statisticsResponseSchema } from "@/lib/register/statistics-contract";
import type { StatisticsPeriod } from "@/lib/register/statistics";
import { AnalyticsPanel, DoctorTable, EmergencyPanel, KeyMetrics, number, QualityPanel, RankedPanel, RoomsPanel, TrendPanel } from "./analytics-panels";
import { StatisticsLoading } from "./statistics-loading";

const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const periods = [{ id: "day", label: "รายวัน" }, { id: "month", label: "รายเดือน" }, { id: "year", label: "รายปี" }] as const;
const field = "h-10 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SurgeryStatistics({ initialDay, overview = false, canReadRegisters = false }: { initialDay: string; overview?: boolean; canReadRegisters?: boolean }) {
  const [period, setPeriod] = useState<StatisticsPeriod>("month");
  const [day, setDay] = useState(initialDay);
  const [month, setMonth] = useState(initialDay.slice(0, 7));
  const [year, setYear] = useState(initialDay.slice(0, 4));
  const [department, setDepartment] = useState("");
  const [reportTab, setReportTab] = useState("workload");
  const value = period === "day" ? day : period === "month" ? month : year;
  const currentYear = Number(initialDay.slice(0, 4));
  const years = Array.from({ length: Math.max(1, currentYear - 2026 + 1) }, (_, index) => String(currentYear - index));
  const query = useQuery({
    queryKey: ["surgery-management-statistics-v3", period, value, department],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ period, value });
      if (department) params.set("department", department);
      const response = await fetch("/api/reports/statistics?" + params, { cache: "no-store", signal });
      if (!response.ok) throw new Error(response.status === 403 ? "ไม่มีสิทธิ์ดูรายงาน กรุณาเข้าสู่ระบบอีกครั้ง" : "โหลดสถิติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      const result = statisticsResponseSchema.safeParse(await response.json());
      if (!result.success) throw new Error("ข้อมูลรายงานไม่ครบตามรูปแบบ กรุณาโหลดใหม่หรือติดต่อผู้ดูแลระบบ");
      return result.data;
    },
    staleTime: 60_000,
    retry: false,
  });
  const data = query.data;
  const periodLabel = period === "day" ? new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" }).format(new Date(day + "T12:00:00+07:00")) : period === "month" ? months[Number(month.slice(5)) - 1] + " " + (Number(month.slice(0, 4)) + 543) : "ปี พ.ศ. " + (Number(year) + 543) + " (ม.ค.–ธ.ค.)";
  const departmentLabel = department ? data?.departments.find((item) => item.id === department)?.name ?? "แผนก " + department : "ทุกแผนก";
  const changePeriod = (next: StatisticsPeriod) => { setPeriod(next); setDepartment(""); };
  const departmentPanel = data ? <RankedPanel title="ภาระงานตามแผนก" description="ทุกแผนกในช่วงที่เลือก · กดชื่อเพื่อดูเฉพาะแผนกนั้น" rows={data.departments} total={data.departments.reduce((sum, row) => sum + row.count, 0)} onSelect={setDepartment} /> : null;

  return <div className="space-y-5">
    <section aria-label="ตัวกรองรายงาน" className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
      <div className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[auto_minmax(0,1fr)_minmax(160px,0.7fr)_auto]">
        <div><p className="mb-2 text-[11px] font-medium text-muted-foreground">ช่วงข้อมูล</p><div role="group" aria-label="เลือกช่วงสถิติ" className="grid h-10 grid-cols-3 rounded-xl bg-muted/60 p-1">{periods.map((option) => <button key={option.id} type="button" aria-pressed={period === option.id} onClick={() => changePeriod(option.id)} className={"rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring " + (period === option.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground")}>{option.label}</button>)}</div></div>
        {period === "day" ? <div className="min-w-0"><ThaiDatePicker compact label="วันที่รายงาน" value={day} onChange={(next) => { setDay(next); setDepartment(""); }} /></div> : period === "month" ? <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_100px] gap-2"><label className="grid gap-2 text-[11px] font-medium text-muted-foreground">เดือน<select value={month.slice(5, 7)} onChange={(event) => { setMonth(month.slice(0, 4) + "-" + event.target.value); setDepartment(""); }} className={field}>{months.map((name, index) => <option key={name} value={String(index + 1).padStart(2, "0")}>{name}</option>)}</select></label><label className="grid gap-2 text-[11px] font-medium text-muted-foreground">ปี พ.ศ.<select value={month.slice(0, 4)} onChange={(event) => { setMonth(event.target.value + "-" + month.slice(5)); setDepartment(""); }} className={field}>{years.map((item) => <option key={item} value={item}>{Number(item) + 543}</option>)}</select></label></div> : <label className="grid gap-2 text-[11px] font-medium text-muted-foreground">ปีปฏิทิน พ.ศ.<select value={year} onChange={(event) => { setYear(event.target.value); setDepartment(""); }} className={field}>{years.map((item) => <option key={item} value={item}>{Number(item) + 543}</option>)}</select></label>}
        <label className="grid min-w-0 gap-2 text-[11px] font-medium text-muted-foreground">แผนก<select value={department} disabled={query.isPending} onChange={(event) => setDepartment(event.target.value)} className={field}><option value="">ทุกแผนก</option>{department && !data?.departments.some((item) => item.id === department) && <option value={department}>{departmentLabel}</option>}{data?.departments.map((item) => <option key={item.id} value={item.id}>{item.name} ({number(item.count)})</option>)}</select></label>
        <Button variant="ghost" disabled={query.isFetching} onClick={() => void query.refetch()} className="h-10 rounded-xl border border-border px-3 py-0 text-xs"><RefreshCw aria-hidden="true" className={"size-3.5 " + (query.isFetching ? "animate-spin motion-reduce:animate-none" : "")} />{query.isFetching ? "กำลังโหลด" : "อัปเดตข้อมูล"}</Button>
      </div>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-2 px-1"><p className="flex flex-wrap items-center gap-2 text-xs font-medium"><CalendarDays className="size-3.5 text-primary" aria-hidden="true" />{periodLabel}<span className="text-muted-foreground">· {departmentLabel}</span></p>{data && <p className="text-[10px] tabular-nums text-muted-foreground">โหลดล่าสุด {new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok", hourCycle: "h23" }).format(new Date(data.generatedAt))} น.</p>}</div>
    {query.isPending ? <StatisticsLoading overview={overview} /> : query.isError ? <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5"><p className="text-sm font-semibold text-destructive">{query.error.message}</p><Button variant="ghost" onClick={() => void query.refetch()} className="mt-3 h-10 px-3 py-0 text-xs">ลองโหลดอีกครั้ง</Button></div> : data ? <div className="space-y-5" aria-busy={query.isFetching}>
      <KeyMetrics data={data} />
      <div role="status" className={"flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs leading-5 " + (!data.hosxpAvailable || data.quality.missingSource ? "border-amber-500/20 bg-amber-500/5 text-amber-900 dark:text-amber-200" : "border-border/70 bg-muted/15 text-muted-foreground")}>{!data.hosxpAvailable || data.quality.missingSource ? <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />}<p>{!data.hosxpAvailable ? "HOSxP ไม่พร้อมใช้งาน ขณะนี้แสดงทะเบียนและทีมที่เก็บไว้ใน OR-Reg ตัวเลขที่ต้องใช้ข้อมูลต้นทางอาจไม่ครบ" : "อ่านรายละเอียดต้นทางได้ " + number(data.sourceCases) + " / " + number(data.totalCases) + " เคส" + (data.quality.missingSource ? " · อีก " + number(data.quality.missingSource) + " เคสยังไม่มีข้อมูลต้นทางในช่วงนี้" : " · จำนวนเคสหมายถึงทะเบียนที่ซิงก์แล้ว ไม่ใช่จำนวนผ่าตัดเสร็จทั้งหมด")}</p></div>
      {overview ? <>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]"><TrendPanel data={data} period={period} /><EmergencyPanel data={data} /></div>
        <div className="grid items-start gap-5 xl:grid-cols-2">{departmentPanel}<QualityPanel data={data} canReadRegisters={canReadRegisters} /></div>
        <Link href="/surgery/reports" className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-primary/5"><span>ดูภาระงานรายแพทย์ การใช้ห้อง และรายงานประจำปี<span className="mt-1 block text-xs font-normal text-muted-foreground">เปิดหน้ารายงานเพื่อวิเคราะห์รายละเอียดและดาวน์โหลดสรุป</span></span><ArrowUpRight className="size-5 shrink-0 text-primary" /></Link>
      </> : <Tabs.Root value={reportTab} onValueChange={(next) => setReportTab(String(next))}>
        <Tabs.List className="mb-5 flex overflow-x-auto rounded-xl border border-border bg-card p-1" aria-label="หมวดรายงาน">{[{ id: "workload", label: "ภาระงาน" }, { id: "rooms", label: "ห้องและระยะเวลา" }, { id: "quality", label: "คุณภาพข้อมูล" }].map((tab) => <Tabs.Tab key={tab.id} value={tab.id} className="min-h-10 min-w-max flex-1 rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring data-[active]:bg-primary data-[active]:text-primary-foreground">{tab.label}</Tabs.Tab>)}</Tabs.List>
        <Tabs.Panel value="workload" className="space-y-5 outline-none"><div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]"><TrendPanel data={data} period={period} /><EmergencyPanel data={data} /></div><div className="grid items-start gap-5 xl:grid-cols-2"><DoctorTable key={period + value + department} data={data} />{departmentPanel}<RankedPanel title="เคสตาม Ward" description="Ward จากเคสที่อ่านรายละเอียดต้นทางได้" rows={data.wards} total={data.sourceCases} /><RankedPanel title="หัตถการที่พบบ่อย" description="10 อันดับแรก · หนึ่งเคสอาจมีหลายหัตถการ" rows={data.procedures} total={data.sourceCases} /></div></Tabs.Panel>
        <Tabs.Panel value="rooms" className="space-y-5 outline-none"><RoomsPanel data={data} filtered={Boolean(department)} /><div className="grid items-start gap-5 xl:grid-cols-2"><RankedPanel title="การกระจายระยะเวลาผ่าตัด" description={"จาก " + number(data.durationCases) + " เคสที่มีเวลาเริ่ม–เสร็จครบ ใช้ค่าที่แก้ใน OR-Reg ก่อนค่าต้นทาง"} rows={data.durationBuckets} total={data.durationCases} /><QualityPanel data={data} canReadRegisters={canReadRegisters} /></div></Tabs.Panel>
        <Tabs.Panel value="quality" className="grid items-start gap-5 outline-none xl:grid-cols-2"><QualityPanel data={data} canReadRegisters={canReadRegisters} /><AnalyticsPanel title="เลื่อนและยกเลิก" description="นับจากข้อความสถานะ HOSxP ของเคสที่มีทะเบียน"><div className="grid grid-cols-2 gap-3">{[{ label: "เลื่อน", value: data.postponed }, { label: "ยกเลิก", value: data.cancelled }].map((item) => <div key={item.label} className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{data.hosxpAvailable ? number(item.value) : "—"}</p></div>)}</div><p className="mt-4 text-xs leading-6 text-muted-foreground">ใช้ติดตามสถานะที่มีอยู่ในช่วงนี้ ไม่ใช่ประวัติการเลื่อนทุกครั้งของเคส และไม่รวมรายการที่ยังไม่ได้ซิงก์เป็นทะเบียน</p></AnalyticsPanel><RankedPanel title="สถานะรายการผ่าตัด" description="ข้อมูลจาก HOSxP ณ เวลาที่โหลดรายงาน" rows={data.statuses} total={data.sourceCases} /></Tabs.Panel>
      </Tabs.Root>}
      <p className="px-1 text-[11px] leading-5 text-muted-foreground">ขอบเขตข้อมูล: เฉพาะทะเบียนที่ซิงก์เข้า OR-Reg ตามวันผ่าตัด · รายปีด้านบนใช้ปีปฏิทิน · สรุปและไฟล์ปีงบประมาณอยู่ในส่วนรายงานประจำปี</p>
    </div> : null}
  </div>;
}
