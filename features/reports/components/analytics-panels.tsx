"use client";

import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import type { StatisticsResponse } from "@/lib/register/statistics-contract";
import type { StatisticsPeriod } from "@/lib/register/statistics";

export const number = (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 1 });
export const percent = (count: number, total: number) => total > 0 ? count / total * 100 : 0;
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)", fontSize: 12 };

export function AnalyticsPanel({ title, description, action, children, className = "" }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-2xl border border-border/80 bg-card shadow-md ${className}`}>
    <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6"><div className="min-w-0"><h2 className="text-sm font-semibold text-foreground sm:text-base">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}</div>{action}</div>
    <div className="p-5 sm:p-6">{children}</div>
  </section>;
}

export function EmptyChart({ children = "ยังไม่มีข้อมูลในช่วงที่เลือก" }: { children?: ReactNode }) {
  return <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border bg-muted/15 p-6 text-center text-sm leading-6 text-muted-foreground">{children}</div>;
}

export function KeyMetrics({ data }: { data: StatisticsResponse }) {
  const emergency = data.emergency.find((row) => row.name === "Emergency")?.count ?? 0;
  const measuredRooms = data.roomTimeCases + data.estimatedRoomCases;
  const metrics = [
    { label: "ทะเบียนผ่าตัด", value: number(data.totalCases), unit: "เคส", description: "รายการที่มีเลขทะเบียนในช่วงที่เลือก", highlight: true },
    { label: "เคสฉุกเฉิน", value: data.hosxpAvailable ? number(emergency) : "—", unit: data.hosxpAvailable ? "เคส" : "", description: data.hosxpAvailable && data.sourceCases ? `${number(percent(emergency, data.sourceCases))}% ของ ${number(data.sourceCases)} เคสที่อ่านรายละเอียดได้` : "รอข้อมูลความเร่งด่วนจาก HOSxP" },
    { label: "เวลาผ่าตัดเฉลี่ย", value: data.averageDurationMinutes === null ? "—" : number(Math.round(data.averageDurationMinutes)), unit: data.averageDurationMinutes === null ? "" : "นาที", description: `จาก ${number(data.durationCases)} เคสที่มีเวลาเริ่ม–เสร็จครบ` },
    { label: "การใช้ห้องผ่าตัด", value: data.utilization && (measuredRooms > 0 || data.totalCases === 0) ? number(data.utilization.percent) : "—", unit: data.utilization && (measuredRooms > 0 || data.totalCases === 0) ? "%" : "", description: data.estimatedRoomCases > 0 ? `มี ${number(data.estimatedRoomCases)} เคสประมาณจากเวลาผ่าตัด` : "ฐานเวลา 24 ชม. ต่อห้อง/วัน ตลอดช่วงที่เลือก" },
  ];
  return <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{metrics.map((item, index) => <article key={item.label} className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${item.highlight ? "border-primary bg-primary text-primary-foreground dark:border-border dark:bg-card dark:text-card-foreground" : "border-border/80 bg-card"}`}>
    <div className="flex items-center justify-between gap-2"><p className={`text-xs font-medium ${item.highlight ? "text-primary-foreground/85 dark:text-muted-foreground" : "text-muted-foreground"}`}>{item.label}</p><span aria-hidden="true" className={`text-[10px] font-medium tabular-nums ${item.highlight ? "text-primary-foreground/60 dark:text-muted-foreground/65" : "text-muted-foreground/50"}`}>0{index + 1}</span></div>
    <p className="mt-4 flex flex-wrap items-baseline gap-2"><strong className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{item.value}</strong><span className={`text-xs ${item.highlight ? "text-primary-foreground/85 dark:text-muted-foreground" : "text-muted-foreground"}`}>{item.unit}</span></p>
    <p className={`mt-3 text-[11px] leading-5 ${item.highlight ? "text-primary-foreground/85 dark:text-muted-foreground" : "text-muted-foreground"}`}>{item.description}</p>
  </article>)}</div>;
}

export function TrendPanel({ data, period }: { data: StatisticsResponse; period: StatisticsPeriod }) {
  const title = period === "day" ? "จำนวนเคสตามเวลาเริ่มผ่าตัด" : period === "month" ? "แนวโน้มจำนวนเคสรายวัน" : "แนวโน้มจำนวนเคสรายเดือน";
  const plotted = data.series.reduce((sum, row) => sum + row.cases, 0);
  const peak = data.series.reduce((best, row) => row.cases > best.cases ? row : best, { key: "", label: "", cases: 0 });
  return <AnalyticsPanel title={title} description={period === "day" ? `มีเวลาเริ่มผ่า ${number(plotted)} / ${number(data.totalCases)} เคส` : "นับตามวันที่ผ่าตัดของทะเบียน OR-Reg"} action={<span className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">{number(plotted)} เคส</span>}>
    {plotted === 0 ? <EmptyChart>{data.totalCases > 0 ? "ยังไม่มีเวลาเริ่มผ่าตัดสำหรับจัดกลุ่มรายชั่วโมง" : "ยังไม่มีทะเบียนในช่วงที่เลือก"}</EmptyChart> : <>
      <div className="h-64 w-full min-w-0" role="img" aria-label={`${title} รวม ${plotted} เคส`}><ResponsiveContainer width="100%" height="100%"><BarChart accessibilityLayer data={data.series} margin={{ top: 8, right: 0, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" /><XAxis dataKey="label" minTickGap={22} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} /><Tooltip formatter={(value) => [`${number(Number(value))} เคส`, "จำนวนทะเบียน"]} contentStyle={tooltipStyle} itemStyle={{ color: "var(--foreground)" }} cursor={{ fill: "var(--muted)" }} /><Bar dataKey="cases" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-border/70 pt-3 text-[11px] text-muted-foreground"><span>สูงสุด {period === "month" ? "วันที่ " : ""}{peak.label} · <strong className="font-semibold text-foreground">{number(peak.cases)} เคส</strong></span><span>{period === "year" ? "มกราคม–ธันวาคม · ปีปฏิทิน" : period === "day" ? "เวลาไทย · 24 ชั่วโมง" : "รวมทุกวันในเดือนที่เลือก"}</span></div>
    </>}
  </AnalyticsPanel>;
}

export function EmergencyPanel({ data }: { data: StatisticsResponse }) {
  const colors = ["var(--primary)", "var(--muted-foreground)", "var(--border)"];
  const rows = ["Elective", "Emergency", "ไม่ระบุ"].map((name, index) => ({ name, count: data.emergency.find((row) => row.name === name)?.count ?? 0, color: colors[index] }));
  return <AnalyticsPanel title="Elective vs Emergency" description="สัดส่วนความเร่งด่วนของเคสที่มีรายละเอียดต้นทาง">
    {!data.hosxpAvailable ? <EmptyChart>ยังอ่านความเร่งด่วนจาก HOSxP ไม่ได้</EmptyChart> : !data.sourceCases ? <EmptyChart /> : <>
      <div className="relative mx-auto size-48" role="img" aria-label={rows.map((row) => `${row.name} ${number(percent(row.count, data.sourceCases))}%`).join(", ")}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={rows} dataKey="count" nameKey="name" innerRadius={62} outerRadius={86} paddingAngle={2} stroke="none" isAnimationActive={false}>{rows.map((row) => <Cell key={row.name} fill={row.color} />)}</Pie><Tooltip formatter={(value) => `${number(Number(value))} เคส`} contentStyle={tooltipStyle} itemStyle={{ color: "var(--foreground)" }} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid content-center justify-items-center"><strong className="text-3xl font-semibold tabular-nums">{number(data.sourceCases)}</strong><span className="mt-1 text-[11px] text-muted-foreground">เคสที่มีข้อมูล</span></div></div>
      <ul className="mt-3 space-y-2.5">{rows.map((row) => <li key={row.name} className="flex items-center gap-2 text-xs"><span className="size-2 rounded-full" style={{ background: row.color }} /><span className="flex-1">{row.name}</span><strong className="tabular-nums">{number(percent(row.count, data.sourceCases))}%</strong><span className="w-16 text-right tabular-nums text-muted-foreground">{number(row.count)} เคส</span></li>)}</ul>
    </>}
  </AnalyticsPanel>;
}

export function RankedPanel({ title, description, rows, total, onSelect }: { title: string; description: string; rows: { id?: string; name: string; count: number }[]; total: number; onSelect?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, 6);
  return <AnalyticsPanel title={title} description={description} action={<span className="text-xs tabular-nums text-muted-foreground">{rows.length} กลุ่ม</span>}>
    {!rows.length ? <EmptyChart /> : <ol className="space-y-4">{shown.map((row, index) => <li key={row.id ?? row.name} className="flex items-start gap-3"><span className="mt-0.5 w-4 shrink-0 text-[10px] tabular-nums text-muted-foreground/70">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><div className="mb-2 flex items-start justify-between gap-3 text-xs">{onSelect && row.id ? <button type="button" onClick={() => onSelect(row.id!)} className="min-w-0 break-words text-left font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{row.name}</button> : <span className="min-w-0 break-words font-medium">{row.name}</span>}<span className="shrink-0 font-semibold tabular-nums">{number(row.count)} <span className="font-normal text-muted-foreground">เคส</span></span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/80" style={{ width: `${Math.min(100, percent(row.count, total))}%` }} /></div></div></li>)}</ol>}
    {rows.length > 6 && <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="mt-5 w-full rounded-lg border border-border py-2.5 text-xs font-semibold text-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">{expanded ? "แสดงน้อยลง" : `ดูครบ ${number(rows.length)} กลุ่ม`}</button>}
  </AnalyticsPanel>;
}

export function QualityPanel({ data, canReadRegisters }: { data: StatisticsResponse; canReadRegisters: boolean }) {
  const rows = [
    { label: "ข้อมูลต้นทาง HOSxP", missing: data.quality.missingSource },
    { label: "เวลาเริ่ม–เสร็จผ่าตัด", missing: data.quality.missingDuration },
    { label: "ทีมผู้ทำการผ่าตัด", missing: data.quality.missingDoctor },
    { label: "ชนิดการดมยา", missing: data.quality.missingAnesthesia },
    { label: "ประเภทผ่าตัดใหญ่/เล็ก", missing: data.quality.missingSurgeryClass },
  ];
  return <AnalyticsPanel title="ความครบถ้วนของข้อมูล" description="แต่ละรายการอาจขาดข้อมูลหลายช่อง จึงไม่ควรบวกยอดค้างรวมกัน" action={canReadRegisters ? <Link href="/surgery/operations" aria-label="เปิดทะเบียนเพื่อตรวจข้อมูล" className="rounded-lg p-2 text-primary hover:bg-accent"><ArrowUpRight className="size-4" /></Link> : undefined}>
    {!data.totalCases ? <EmptyChart>ยังไม่มีทะเบียนให้ตรวจความครบถ้วน</EmptyChart> : <div className="space-y-5">{rows.map((row) => <div key={row.label}><div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-medium">{row.label}</span><span className={row.missing ? "font-medium text-amber-700 dark:text-amber-300" : "text-primary"}>{row.missing ? `ขาด ${number(row.missing)} เคส` : "ครบทุกเคส"}</span></div><div className="flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/80" style={{ width: `${percent(data.totalCases - row.missing, data.totalCases)}%` }} /></div><span className="w-10 text-right text-[10px] tabular-nums text-muted-foreground">{number(percent(data.totalCases - row.missing, data.totalCases))}%</span></div></div>)}</div>}
  </AnalyticsPanel>;
}

export function RoomsPanel({ data, filtered }: { data: StatisticsResponse; filtered: boolean }) {
  const utilization = data.utilization;
  const measured = data.roomTimeCases + data.estimatedRoomCases;
  return <AnalyticsPanel title="การใช้ห้องผ่าตัด · Utilization" description="เวลาใช้ห้อง ÷ เวลาพร้อมใช้ 24 ชั่วโมงต่อห้อง/วัน · รวมเวลาซ้อนเพียงครั้งเดียว">
    {!data.hosxpAvailable ? <EmptyChart>ยังคำนวณไม่ได้ เนื่องจากอ่านข้อมูลห้องผ่าตัดไม่สำเร็จ</EmptyChart> : !utilization ? <EmptyChart>ยังไม่มีรายชื่อห้องผ่าตัดสำหรับคำนวณ</EmptyChart> : <>
      <div className="mb-5 grid gap-4 rounded-xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-[auto_1fr] sm:items-center"><div><p className="text-xs text-muted-foreground">{filtered ? "สัดส่วนการใช้โดยแผนกที่เลือก" : "ภาพรวมทุกห้อง"}</p><p className="mt-1 text-4xl font-semibold tracking-tight text-primary tabular-nums">{measured || !data.totalCases ? `${number(utilization.percent)}%` : "—"}</p></div><div className="text-xs leading-6 text-muted-foreground"><p>ใช้ {number(utilization.usedMinutes / 60)} ชม. / พร้อมใช้ {number(utilization.availableMinutes / 60)} ชม.</p><p>{utilization.rooms.length} ห้อง · ตลอดช่วงวันที่เลือก{filtered ? " · ตัวหารยังเป็นทุกห้อง" : ""}</p>{!measured && data.totalCases > 0 && <p className="text-amber-700 dark:text-amber-300">ยังไม่มีข้อมูลเวลาและห้องที่นำมาคำนวณได้</p>}</div></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{utilization.rooms.map((room) => <div key={room.id} className="rounded-xl border border-border/80 p-4"><div className="flex items-start justify-between gap-3"><p className="text-xs font-medium">{room.name}</p><strong className="text-sm text-primary tabular-nums">{measured || !data.totalCases ? `${number(room.percent)}%` : "—"}</strong></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/80" style={{ width: `${room.percent}%` }} /></div><p className="mt-2 text-[11px] tabular-nums text-muted-foreground">{number(room.usedMinutes / 60)} / {number(room.availableMinutes / 60)} ชม.</p></div>)}</div>
      <div className="mt-5 grid gap-2 border-t border-border pt-4 text-xs sm:grid-cols-3"><p><span className="block text-muted-foreground">ใช้เวลาเข้า–ออกห้อง</span><strong className="mt-1 block tabular-nums">{number(data.roomTimeCases)} เคส</strong></p><p><span className="block text-muted-foreground">ประมาณจากเวลาผ่าตัด</span><strong className="mt-1 block tabular-nums">{number(data.estimatedRoomCases)} เคส</strong></p><p><span className="block text-muted-foreground">เวลา/ห้องไม่ครบ · ไม่นำมาคิด</span><strong className="mt-1 block tabular-nums">{number(data.missingUtilizationTimes)} เคส</strong></p></div>
      <p className="mt-4 text-[11px] leading-5 text-muted-foreground">รวมวันหยุดและวันที่ยังไม่ถึงในช่วงที่เลือก ค่าประมาณจากเวลาผ่าตัดไม่รวมช่วงเตรียมห้องและพักฟื้น และไม่ใช่การวัดประสิทธิภาพบุคลากร</p>
    </>}
  </AnalyticsPanel>;
}

type DoctorRow = StatisticsResponse["doctors"][number];
const tableSetup = tableFeatures({});
const column = createColumnHelper<typeof tableSetup, DoctorRow>();
const doctorColumns = column.columns([column.accessor("name", { header: "แพทย์ผู้ทำการผ่าตัด" }), column.accessor("cases", { header: "จำนวนเคส" })]);

export function DoctorTable({ data }: { data: StatisticsResponse }) {
  const [search, setSearch] = useState("");
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(0);
  const filtered = data.doctors.filter((row) => row.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).sort((a, b) => (ascending ? a.cases - b.cases : b.cases - a.cases) || a.name.localeCompare(b.name, "th"));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages - 1);
  const table = useTable({ features: tableSetup, columns: doctorColumns, data: filtered.slice(currentPage * 10, currentPage * 10 + 10) });
  return <AnalyticsPanel title="ภาระงานรายแพทย์" description="เคสเดียวมีแพทย์หลายคนได้ ยอดรายแพทย์จึงอาจรวมเกินจำนวนทะเบียน" action={<span className="shrink-0 text-xs text-muted-foreground">{number(data.doctorCount)} คน</span>}>
    <label className="mb-4 flex items-center gap-2 rounded-xl border border-input bg-background px-3"><Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /><span className="sr-only">ค้นหาแพทย์</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="ค้นหาชื่อแพทย์…" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
    <table className="w-full text-left text-xs"><caption className="sr-only">จำนวนเคสไม่ซ้ำต่อแพทย์</caption><thead><tr className="border-b border-border text-muted-foreground"><th scope="col" className="pb-3 font-medium">แพทย์ผู้ทำการผ่าตัด</th><th scope="col" aria-sort={ascending ? "ascending" : "descending"} className="pb-3 text-right"><button type="button" onClick={() => { setAscending(!ascending); setPage(0); }} className="inline-flex items-center gap-1 rounded p-1 font-medium hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">เคส{ascending ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}</button></th><th scope="col" className="hidden pb-3 text-right font-medium sm:table-cell">สัดส่วนต่อทะเบียน</th></tr></thead><tbody>{table.getRowModel().rows.map(({ original: row }) => <tr key={row.id} className="border-b border-border/60 hover:bg-muted/20"><td className="py-3 pr-3 leading-5">{row.name}</td><td className="py-3 text-right font-semibold tabular-nums">{number(row.cases)}</td><td className="hidden py-3 pl-5 text-right tabular-nums text-muted-foreground sm:table-cell">{number(percent(row.cases, data.totalCases))}%</td></tr>)}</tbody></table>
    {!filtered.length && <p className="py-8 text-center text-xs text-muted-foreground">{search ? "ไม่พบแพทย์ที่ตรงกับคำค้น" : "ยังไม่มีทีมผู้ทำการผ่าตัดที่ซิงก์ไว้"}</p>}
    <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-muted-foreground"><span>หน้า {currentPage + 1} / {pages} · {number(filtered.length)} คน</span><div className="flex gap-2"><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} aria-label="แพทย์หน้าก่อนหน้า" className="grid size-9 place-items-center rounded-lg border border-border hover:bg-accent disabled:opacity-35"><ChevronLeft className="size-4" /></button><button type="button" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)} aria-label="แพทย์หน้าถัดไป" className="grid size-9 place-items-center rounded-lg border border-border hover:bg-accent disabled:opacity-35"><ChevronRight className="size-4" /></button></div></div>
  </AnalyticsPanel>;
}
