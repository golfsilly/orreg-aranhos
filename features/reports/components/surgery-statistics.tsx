"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertCircle, BarChart3, CalendarDays, Clock3, Stethoscope, UsersRound } from "lucide-react";
import { ResponsiveScroll } from "@/components/ui/responsive-scroll";
import { ThaiDatePicker } from "@/features/operations/components/shared/thai-date-picker";
import type { StatisticsPeriod, StatisticsBucket } from "@/lib/register/statistics";

type StatisticsResponse = {
  period: Uppercase<StatisticsPeriod>;
  value: string;
  totalCases: number;
  sourceCases: number;
  doctorCount: number;
  series: StatisticsBucket[];
  doctors: { name: string; cases: number }[];
  emergency: { name: string; count: number }[];
  procedures: { name: string; count: number }[];
  wards: { name: string; count: number }[];
  statuses: { name: string; count: number }[];
  postponed: number;
  cancelled: number;
  averageDurationMinutes: number | null;
  durationCases: number;
  durationBuckets: { name: string; count: number }[];
  utilization: null | { usedMinutes: number; availableMinutes: number; percent: number; rooms: { id: string; name: string; usedMinutes: number; availableMinutes: number; percent: number }[] };
  missingRoomTimes: number;
  roomTimeCases: number;
  estimatedRoomCases: number;
  missingUtilizationTimes: number;
  hosxpAvailable: boolean;
};

const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const periods: { id: StatisticsPeriod; label: string }[] = [{ id: "day", label: "รายวัน" }, { id: "month", label: "รายเดือน" }, { id: "year", label: "รายปี" }];

function bangkokToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (name: string) => parts.find((part) => part.type === name)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function hourText(minutes: number) {
  const hours = minutes / 60;
  return `${hours.toLocaleString("th-TH", { maximumFractionDigits: 1 })} ชม.`;
}

function StatCard({ label, value, detail, icon: Icon, accent = "primary" }: { label: string; value: string; detail: string; icon: typeof Activity; accent?: "primary" | "blue" | "amber" }) {
  const tone = accent === "blue" ? "bg-sky-500/10 text-sky-700 dark:text-sky-300" : accent === "amber" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary";
  return <article className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="m-0 text-xs font-medium text-muted-foreground">{label}</p><p className="mb-0 mt-3 truncate text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</p></div><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon aria-hidden="true" className="size-5" /></span></div><p className="mb-0 mt-2 text-[11px] leading-5 text-muted-foreground">{detail}</p></article>;
}

function ReportChart({ data, period }: { data: StatisticsBucket[]; period: StatisticsPeriod }) {
  const title = period === "day" ? "จำนวนเคสรายชั่วโมง" : period === "month" ? "จำนวนเคสรายวัน" : "จำนวนเคสรายเดือน";
  return <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-base font-semibold tracking-tight">{title}</h2><p className="mb-0 mt-1 text-xs text-muted-foreground">นับจากวันที่ผ่าตัดของทะเบียนที่ซิงก์แล้ว</p></div><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BarChart3 aria-hidden="true" className="size-[18px]" /></span></div>
    <p className="mb-2 mt-4 text-[11px] text-muted-foreground sm:hidden">เลื่อนกราฟด้านข้างเพื่อดูข้อมูลทั้งหมด</p>
    <ResponsiveScroll label={title}>
      <div className="mt-4 h-[260px] min-w-[580px]" role="img" aria-label={`${title}: ${data.map((item) => `${item.label} ${item.cases} เคส`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" /><XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} interval={period === "month" ? 2 : "preserveStartEnd"} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><Tooltip formatter={(value) => [Number(value).toLocaleString("th-TH"), "เคส"]} cursor={{ fill: "var(--muted)", opacity: 0.45 }} contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }} itemStyle={{ color: "var(--popover-foreground)" }} labelStyle={{ color: "var(--muted-foreground)" }} /><Bar dataKey="cases" name="เคส" fill="var(--primary)" radius={[5, 5, 0, 0]} maxBarSize={30} /></BarChart></ResponsiveContainer>
      </div>
    </ResponsiveScroll>
  </section>;
}

function DoctorsChart({ doctors }: { doctors: StatisticsResponse["doctors"] }) {
  return <section className="min-w-0 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-base font-semibold tracking-tight">จำนวนเคสรายแพทย์</h2><p className="mb-0 mt-1 text-xs text-muted-foreground">นับเคสไม่ซ้ำต่อแพทย์ · แสดง 10 อันดับแรก</p></div><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300"><Stethoscope aria-hidden="true" className="size-[18px]" /></span></div>
    {doctors.length ? <><p className="mb-2 mt-4 text-[11px] text-muted-foreground sm:hidden">เลื่อนกราฟด้านข้างเพื่อดูชื่อแพทย์</p><ResponsiveScroll label="กราฟจำนวนเคสรายแพทย์"><div className="mt-4 h-[300px] min-w-[560px]" role="img" aria-label={`จำนวนเคสรายแพทย์: ${doctors.map((doctor) => `${doctor.name} ${doctor.cases} เคส`).join(", ")}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={doctors} layout="vertical" margin={{ top: 2, right: 24, left: 2, bottom: 2 }}><CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={{ fill: "var(--foreground)", fontSize: 11 }} /><Tooltip formatter={(value) => [Number(value).toLocaleString("th-TH"), "เคส"]} cursor={{ fill: "var(--muted)", opacity: 0.45 }} contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }} itemStyle={{ color: "var(--popover-foreground)" }} /><Bar dataKey="cases" name="เคส" fill="#27815f" radius={[0, 5, 5, 0]} maxBarSize={20} /></BarChart></ResponsiveContainer></div></ResponsiveScroll></> : <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูลทีมผ่าตัดที่ซิงก์ในช่วงนี้</div>}
  </section>;
}

function UtilizationPanel({ data, hosxpAvailable, missingRoomTimes, roomTimeCases, estimatedRoomCases, missingUtilizationTimes }: {
  data: StatisticsResponse["utilization"];
  hosxpAvailable: boolean;
  missingRoomTimes: number;
  roomTimeCases: number;
  estimatedRoomCases: number;
  missingUtilizationTimes: number;
}) {
  return <section className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm">
    <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-5 sm:px-7 sm:py-6">
      <div><p className="mb-1 text-[10px] font-bold tracking-[0.16em] text-primary">OPERATING ROOM EFFICIENCY</p><h2 className="m-0 text-lg font-semibold tracking-tight">การใช้ห้องผ่าตัด</h2><p className="mb-0 mt-1 text-xs text-muted-foreground">สัดส่วนเวลาที่ใช้ต่อเวลาพร้อมใช้ 24 ชั่วโมงต่อห้อง/วัน</p></div>
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300"><Activity aria-hidden="true" className="size-5" /></span>
    </div>
    <div className="p-5 sm:p-7">
      {!hosxpAvailable ? <div className="flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-900 dark:text-amber-200"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><p className="m-0">ยังคำนวณ Utilization ไม่ได้ เพราะเชื่อมต่อข้อมูลห้องจาก HOSxP ไม่สำเร็จ</p></div> : !data ? <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">HOSxP ยังไม่ส่งรายชื่อห้องผ่าตัดสำหรับช่วงนี้</div> : <>
        <div className="grid gap-6 lg:grid-cols-[minmax(190px,0.7fr)_minmax(0,1.3fr)] lg:items-center">
          <div className="flex items-center gap-5 rounded-2xl bg-muted/35 p-4 sm:p-5">
            <div className="grid size-24 shrink-0 place-items-center rounded-full p-2" role="img" aria-label={`Utilization รวม ${data.percent.toLocaleString("th-TH", { maximumFractionDigits: 1 })}%`} style={{ background: `conic-gradient(var(--primary) ${data.percent}%, var(--muted) 0)` }}>
              <div className="grid size-full place-items-center rounded-full bg-card"><strong className="text-2xl font-semibold tracking-tight tabular-nums">{data.percent.toLocaleString("th-TH", { maximumFractionDigits: 1 })}%</strong></div>
            </div>
            <div className="min-w-0"><p className="m-0 text-sm font-semibold">ภาพรวมทุกห้อง</p><p className="mb-0 mt-1 text-xs leading-5 text-muted-foreground">ใช้ห้อง {hourText(data.usedMinutes)} จาก {hourText(data.availableMinutes)}</p><p className="mb-0 mt-1 text-[10px] text-muted-foreground">{data.rooms.length} ห้อง · ไม่นับช่วงเวลาซ้อน</p></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.rooms.map((room) => <article key={room.id} className="rounded-2xl border border-border/70 bg-background/65 p-3.5">
            <div className="flex items-start justify-between gap-2"><span className="min-w-0 truncate text-xs font-semibold">{room.name}</span><span className="shrink-0 text-xs font-bold tabular-nums text-primary">{room.percent.toLocaleString("th-TH", { maximumFractionDigits: 1 })}%</span></div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${room.percent}%` }} /></div>
            <p className="mb-0 mt-2 text-[10px] tabular-nums text-muted-foreground">ใช้ {hourText(room.usedMinutes)} / {hourText(room.availableMinutes)}</p>
          </article>)}</div>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-[11px] text-muted-foreground">
          <span>ใช้เวลาเข้า–ออกห้อง {roomTimeCases.toLocaleString("th-TH")} เคส</span>
          <span>ประมาณจากเวลาเริ่ม–เสร็จ {estimatedRoomCases.toLocaleString("th-TH")} เคส</span>
          <span>ไม่มีเวลาครบ {missingUtilizationTimes.toLocaleString("th-TH")} เคส</span>
        </div>
        {missingRoomTimes > 0 && <p className="mb-0 mt-3 text-[10px] leading-5 text-muted-foreground">ยังไม่มีเวลาเข้า–ออกห้องที่บันทึกใน OR-Reg {missingRoomTimes.toLocaleString("th-TH")} เคส ระบบจึงใช้เวลาเริ่ม–เสร็จผ่าตัดจาก HOSxP หรือ OR-Reg ประมาณแทนเมื่อมีข้อมูลครบ</p>}
      </>}
    </div>
  </section>;
}

function BreakdownPanel({ title, description, rows, icon: Icon, limit = 8 }: { title: string; description: string; rows: { name: string; count: number }[]; icon: typeof Activity; limit?: number }) {
  const visibleRows = rows.slice(0, limit);
  const max = Math.max(1, ...visibleRows.map((row) => row.count));
  return <section className="min-w-0 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-base font-semibold tracking-tight">{title}</h2><p className="mb-0 mt-1 text-xs text-muted-foreground">{description}</p></div><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-[18px]" /></span></div>{visibleRows.length ? <div className="mt-5 space-y-3">{visibleRows.map((row) => <div key={row.name}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate font-medium">{row.name}</span><span className="shrink-0 tabular-nums text-muted-foreground">{row.count.toLocaleString("th-TH")} เคส</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/75" style={{ width: `${Math.max(row.count ? 3 : 0, (row.count / max) * 100)}%` }} /></div></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">ยังไม่มีข้อมูลในช่วงนี้</div>}</section>;
}

function EmergencyMix({ rows, total }: { rows: { name: string; count: number }[]; total: number }) {
  const colors: Record<string, string> = { Elective: "#267858", Emergency: "#d79a38", "ไม่ระบุ": "#9aa9a0" };
  const chartRows = rows.map((row) => ({ ...row, percent: total ? (row.count / total) * 100 : 0 }));
  return <section className="min-w-0 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-base font-semibold tracking-tight">Elective vs Emergency</h2><p className="mb-0 mt-1 text-xs text-muted-foreground">สัดส่วน {total.toLocaleString("th-TH")} เคสจาก HOSxP ที่มีเลขทะเบียน OR-Reg</p></div><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Activity aria-hidden="true" className="size-[18px]" /></span></div>
    <div className="mt-5 grid items-center gap-5 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-7">
      <div className="relative mx-auto size-44" role="img" aria-label={"สัดส่วน Elective และ Emergency: " + chartRows.map((row) => row.name + " " + row.percent.toLocaleString("th-TH", { maximumFractionDigits: 1 }) + "%").join(", ")}>
        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartRows} dataKey="count" nameKey="name" innerRadius={56} outerRadius={78} paddingAngle={2} stroke="none" isAnimationActive={false}>{chartRows.map((row) => <Cell key={row.name} fill={colors[row.name] ?? colors["ไม่ระบุ"]} />)}</Pie><Tooltip formatter={(value, name) => [Number(value).toLocaleString("th-TH") + " เคส", String(name)]} contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }} itemStyle={{ color: "var(--popover-foreground)" }} /></PieChart></ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-semibold tracking-tight tabular-nums">{total.toLocaleString("th-TH")}</span><span className="mt-0.5 text-[11px] text-muted-foreground">เคสทั้งหมด</span></div>
      </div>
      <ul className="m-0 grid list-none gap-2.5 p-0 sm:gap-3">{chartRows.map((row) => <li key={row.name} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/15 px-3.5 py-3"><div className="flex min-w-0 items-center gap-2.5"><span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[row.name] ?? colors["ไม่ระบุ"] }} /><span className="truncate text-sm font-medium">{row.name}</span></div><div className="shrink-0 text-right"><span className="text-sm font-semibold tabular-nums">{row.percent.toLocaleString("th-TH", { maximumFractionDigits: 1 })}%</span><span className="ml-2 text-xs tabular-nums text-muted-foreground">{row.count.toLocaleString("th-TH")} เคส</span></div></li>)}</ul>
    </div>
  </section>;
}

function OperationsInsights({ data }: { data: StatisticsResponse }) {
  const emergency = ["Elective", "Emergency"].map((name) => data.emergency.find((row) => row.name === name) ?? { name, count: 0 });
  const emergencyRows = [...emergency, ...(data.emergency.some((row) => row.name === "ไม่ระบุ") ? [{ name: "ไม่ระบุ", count: data.emergency.find((row) => row.name === "ไม่ระบุ")!.count }] : [])];
  const durationLabel = data.averageDurationMinutes === null ? "—" : data.averageDurationMinutes < 60 ? `${Math.round(data.averageDurationMinutes)} นาที` : `${Math.floor(data.averageDurationMinutes / 60)} ชม. ${Math.round(data.averageDurationMinutes % 60)} นาที`;
  return <div className="grid items-start gap-4 xl:grid-cols-2">
    <EmergencyMix rows={emergencyRows} total={data.sourceCases} />
    <BreakdownPanel title="หัตถการที่พบบ่อย" description="นับเคสไม่ซ้ำต่อรายการผ่าตัด · 10 อันดับแรก" rows={data.procedures} icon={BarChart3} limit={10} />
    <BreakdownPanel title="จำนวนเคสราย Ward" description="Ward จากข้อมูล HOSxP" rows={data.wards} icon={UsersRound} />
    <section className="min-w-0 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-base font-semibold tracking-tight">ระยะเวลาผ่าตัดเฉลี่ย</h2><p className="mb-0 mt-1 text-xs text-muted-foreground">คำนวณจากเวลาเริ่ม–เสร็จใน HOSxP</p></div><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300"><Clock3 aria-hidden="true" className="size-[18px]" /></span></div><p className="mb-0 mt-5 text-3xl font-semibold tracking-tight tabular-nums">{durationLabel}</p><p className="mb-0 mt-1 text-xs text-muted-foreground">{data.durationCases.toLocaleString("th-TH")} เคสมีเวลาครบ</p><div className="mt-5 space-y-3 border-t border-border pt-4">{data.durationBuckets.map((row) => <div key={row.name} className="flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">{row.name}</span><span className="font-semibold tabular-nums">{row.count.toLocaleString("th-TH")} เคส</span></div>)}</div></section>
    <section className="min-w-0 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-base font-semibold tracking-tight">สถานะและปัญหาการดำเนินงาน</h2><p className="mb-0 mt-1 text-xs text-muted-foreground">สถานะที่ส่งมาจาก HOSxP</p></div><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300"><AlertCircle aria-hidden="true" className="size-[18px]" /></span></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.05] p-3"><p className="m-0 text-[10px] text-muted-foreground">เลื่อน</p><p className="mb-0 mt-1 text-xl font-semibold tabular-nums">{data.postponed.toLocaleString("th-TH")}</p></div><div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.05] p-3"><p className="m-0 text-[10px] text-muted-foreground">ยกเลิก</p><p className="mb-0 mt-1 text-xl font-semibold tabular-nums">{data.cancelled.toLocaleString("th-TH")}</p></div></div><div className="mt-4 space-y-2 border-t border-border pt-4">{data.statuses.slice(0, 6).map((row) => <div key={row.name} className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate text-muted-foreground">{row.name}</span><span className="shrink-0 font-semibold tabular-nums">{row.count.toLocaleString("th-TH")}</span></div>)}{!data.statuses.length && <p className="m-0 text-xs text-muted-foreground">ยังไม่มีข้อมูลสถานะในช่วงนี้</p>}</div></section>
  </div>;
}

function StatisticsLoading() {
  return <div className="space-y-5" aria-label="กำลังโหลดสถิติ"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div><div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]"><div className="h-[360px] animate-pulse rounded-2xl bg-muted" /><div className="h-[360px] animate-pulse rounded-2xl bg-muted" /></div><div className="grid gap-4 xl:grid-cols-2">{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-[280px] animate-pulse rounded-2xl bg-muted" />)}</div><div className="h-[420px] animate-pulse rounded-2xl bg-muted" /></div>;
}

export function SurgeryStatistics() {
  const [period, setPeriod] = useState<StatisticsPeriod>("month");
  const [day, setDay] = useState(bangkokToday);
  const [month, setMonth] = useState(() => bangkokToday().slice(0, 7));
  const [year, setYear] = useState(() => bangkokToday().slice(0, 4));
  const value = period === "day" ? day : period === "month" ? month : year;
  const years = Array.from({ length: Math.max(1, Number(bangkokToday().slice(0, 4)) - 2021) }, (_, index) => String(Number(bangkokToday().slice(0, 4)) - index));
  const query = useQuery({
    queryKey: ["surgery-statistics-v2", period, value],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ period, value });
      const response = await fetch(`/api/reports/statistics?${params}`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("โหลดสถิติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      return await response.json() as StatisticsResponse;
    },
    staleTime: 60_000,
  });
  const doctorCount = query.data?.doctorCount ?? query.data?.doctors?.length ?? 0;

  return <section className="space-y-4" aria-label="รายงานและสถิติการผ่าตัด">
    <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-5">
      <div><p className="mb-1 text-[10px] font-bold tracking-[0.16em] text-primary">SURGERY ANALYTICS</p><h2 className="m-0 text-lg font-semibold tracking-tight">สถิติการผ่าตัด</h2><p className="mb-0 mt-1 text-xs text-muted-foreground">เลือกช่วงเวลาเพื่อดูจำนวนเคส แพทย์ และการใช้ห้อง</p></div>
      <div className="flex flex-col gap-3 sm:items-end">
        <div role="group" aria-label="เลือกช่วงสถิติ" className="grid h-11 grid-cols-3 rounded-xl border border-border bg-muted/40 p-1">{periods.map((option) => <button key={option.id} type="button" aria-pressed={period === option.id} onClick={() => setPeriod(option.id)} className={`rounded-lg px-4 text-xs font-semibold transition ${period === option.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}>{option.label}</button>)}</div>
        {period === "day" ? <div className="w-full sm:w-[280px]"><ThaiDatePicker compact label="วันที่รายงาน" value={day} onChange={setDay} /></div> : period === "month" ? <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(112px,auto)] gap-2 sm:w-[320px]"><label className="grid gap-1 text-[10px] font-semibold text-muted-foreground">เดือน<select aria-label="เลือกเดือนรายงาน" value={month.slice(5, 7)} onChange={(event) => setMonth(`${month.slice(0, 4)}-${event.target.value}`)} className="h-11 min-w-0 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{months.map((name, index) => <option key={name} value={String(index + 1).padStart(2, "0")}>{name}</option>)}</select></label><label className="grid gap-1 text-[10px] font-semibold text-muted-foreground">ปี พ.ศ.<select aria-label="เลือกปีรายงาน" value={month.slice(0, 4)} onChange={(event) => setMonth(`${event.target.value}-${month.slice(5, 7)}`)} className="h-11 min-w-0 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{years.map((item) => <option key={item} value={item}>{Number(item) + 543}</option>)}</select></label></div> : <label className="grid w-full gap-1 text-[10px] font-semibold text-muted-foreground sm:w-[180px]">ปี พ.ศ.<select aria-label="เลือกปีรายงาน" value={year} onChange={(event) => setYear(event.target.value)} className="h-11 min-w-0 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{years.map((item) => <option key={item} value={item}>{Number(item) + 543}</option>)}</select></label>}
      </div>
    </div>

    {query.isPending ? <StatisticsLoading /> : query.isError ? <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/[0.04] p-5"><p className="m-0 text-sm font-semibold text-destructive">{query.error.message}</p><button type="button" onClick={() => void query.refetch()} className="mt-3 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold">ลองอีกครั้ง</button></div> : query.data ? <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="เคสผ่าตัด" value={query.data.totalCases.toLocaleString("th-TH")} detail="ทะเบียนที่ซิงก์เข้า OR-Reg ในช่วงนี้" icon={CalendarDays} /><StatCard label="แพทย์ที่มีเคส" value={doctorCount.toLocaleString("th-TH")} detail="อ้างอิงจากทีมตำแหน่งผู้ทำการผ่าตัด" icon={UsersRound} accent="blue" /><StatCard label="ระยะเวลาผ่าตัดเฉลี่ย" value={query.data.averageDurationMinutes === null ? "—" : `${Math.round(query.data.averageDurationMinutes).toLocaleString("th-TH")} นาที`} detail={`${query.data.durationCases.toLocaleString("th-TH")} เคสมีเวลาเริ่ม–เสร็จ`} icon={Clock3} /><StatCard label="เลื่อน / ยกเลิก" value={`${query.data.postponed.toLocaleString("th-TH")} / ${query.data.cancelled.toLocaleString("th-TH")}`} detail="จำแนกจากสถานะที่ HOSxP ส่งมา" icon={AlertCircle} accent="amber" /></div>
      {!query.data.hosxpAvailable && <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-xs leading-5 text-amber-900 dark:text-amber-200"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><p className="m-0">กำลังแสดงจำนวนทะเบียนและทีมแพทย์จาก OR-Reg แต่รายละเอียด Elective/Emergency, Operation, Ward, สถานะ และระยะเวลาจาก HOSxP ยังโหลดไม่ได้</p></div>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]"><ReportChart data={query.data.series} period={period} /><DoctorsChart doctors={query.data.doctors} /></div>
      <OperationsInsights data={query.data} />
      <UtilizationPanel data={query.data.utilization} hosxpAvailable={query.data.hosxpAvailable} missingRoomTimes={query.data.missingRoomTimes} roomTimeCases={query.data.roomTimeCases} estimatedRoomCases={query.data.estimatedRoomCases} missingUtilizationTimes={query.data.missingUtilizationTimes} />
      <p className="m-0 px-1 text-[11px] leading-5 text-muted-foreground">จำนวนเคสนับจากทะเบียน OR-Reg · รายละเอียด Elective/Emergency, Operation, Ward, สถานะ และเวลาผ่าตัดอ่านจาก HOSxP แบบ read-only · Utilization ใช้เวลาเข้า–ออกห้องที่บันทึกไว้ก่อน หากไม่มีใช้เวลาเริ่ม–เสร็จผ่าตัดเป็นค่าประมาณ เทียบกับ 24 ชั่วโมงต่อห้อง/วัน และรวมช่วงเวลาซ้อนเพียงครั้งเดียว</p>
    </div> : null}
  </section>;
}
