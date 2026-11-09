"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

const yearSchema = z.object({ year: z.string().regex(/^\d{4}$/).refine((year) => Number(year) >= 2400 && Number(year) <= 2800) });
type Year = z.infer<typeof yearSchema>;
const buttonClass = "mt-[22px] inline-flex cursor-pointer items-center justify-center gap-8 rounded-[10px] border-0 bg-primary px-5 py-[15px] font-bold text-primary-foreground no-underline hover:bg-primary/90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function ReportYearFilter({ fiscalYear }: { fiscalYear: number }) {
  const router = useRouter();
  const form = useForm<Year>({ resolver: zodResolver(yearSchema), defaultValues: { year: String(fiscalYear) }, values: { year: String(fiscalYear) } });
  return <form onSubmit={form.handleSubmit(({ year }) => router.push(`/surgery/reports?year=${year}`))} className="flex flex-wrap items-end gap-3 [&_label]:m-0 [&_label]:w-full [&_label]:min-w-0 [&_button]:m-0 [&_a]:m-0 sm:[&_label]:w-auto sm:[&_label]:min-w-[220px]"><label className="mt-5 block text-sm font-bold">ปีงบประมาณ<input className="mt-2 block w-full rounded-lg border border-input p-[13px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring" {...form.register("year")} type="number" min="2400" max="2800" required /></label><button className={buttonClass}>แสดงรายงาน</button><a className={buttonClass} href={`/api/reports/yearly?year=${fiscalYear}`}>ดาวน์โหลด CSV</a><a className={buttonClass} href={`/api/reports/yearly/pdf?year=${fiscalYear}`}>ดาวน์โหลด PDF</a>{form.formState.errors.year && <p role="alert" className="text-sm text-destructive">ปีงบประมาณไม่ถูกต้อง</p>}</form>;
}

type Row = { name: string; count: number };
const features = tableFeatures({});
const helper = createColumnHelper<typeof features, Row>();
const columns = helper.columns([helper.accessor("name", { header: "รายการ" }), helper.accessor("count", { header: "จำนวน" })]);
export function ReportTable({ title, rows }: { title: string; rows: Row[] }) {
  const table = useTable({ features, columns, data: rows });
  return <section className="[&_h2]:text-lg [&_h2]:font-semibold"><h2>{title}</h2><table className="w-full border-collapse text-left text-sm"><thead><tr><th className="border-b border-border px-2.5 py-3.5 font-semibold text-muted-foreground">รายการ</th><th className="border-b border-border px-2.5 py-3.5 font-semibold text-muted-foreground">จำนวน</th></tr></thead><tbody>{table.getRowModel().rows.map(({ original: row }) => <tr key={row.name}><td className="border-b border-border px-2.5 py-3.5">{row.name}</td><td className="border-b border-border px-2.5 py-3.5">{row.count.toLocaleString("th-TH")}</td></tr>)}</tbody></table></section>;
}
