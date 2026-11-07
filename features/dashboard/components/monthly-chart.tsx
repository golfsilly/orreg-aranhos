"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ResponsiveScroll } from "@/components/ui/responsive-scroll";

export function MonthlyChart({ data, fiscalYear }: { data: { month: string; count: number }[]; fiscalYear: number }) {
  return <div className="mt-6"><p className="mb-2 text-xs text-muted-foreground sm:hidden">เลื่อนกราฟไปด้านข้างเพื่อดูทุกเดือน</p><ResponsiveScroll label="กราฟสถิติรายเดือน เลื่อนด้านข้างได้"><div role="img" aria-label={`จำนวนรายการรายเดือน ปีงบประมาณ ${fiscalYear}: ${data.map((row) => `${row.month} ${row.count}`).join(", ")}`}>
    <div className="h-[260px] min-w-[560px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} /><Tooltip formatter={(value) => [Number(value).toLocaleString("th-TH"), "รายการ"]} cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }} itemStyle={{ color: "var(--popover-foreground)" }} /><Bar dataKey="count" fill="var(--primary)" radius={[5, 5, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer></div>
  </div></ResponsiveScroll></div>;
}
