"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { FileDown, Sheet } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const yearSchema = z.object({ year: z.string().regex(/^\d{4}$/).refine((year) => Number(year) >= 2569 && Number(year) <= 2800) });
type Year = z.infer<typeof yearSchema>;
const download = "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring";

export function ReportYearFilter({ fiscalYear, currentFiscalYear }: { fiscalYear: number; currentFiscalYear: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<Year>({ resolver: zodResolver(yearSchema), values: { year: String(fiscalYear) } });
  const years = Array.from({ length: Math.max(1, currentFiscalYear - 2569 + 1) }, (_, index) => currentFiscalYear - index);
  return <form onSubmit={form.handleSubmit(({ year }) => startTransition(() => router.push("/surgery/reports?year=" + year)))} className="flex flex-wrap items-end gap-2.5"><label className="grid w-full gap-2 text-xs font-medium text-muted-foreground sm:w-44">ปีงบประมาณ<select {...form.register("year")} className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring">{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label><Button disabled={pending} className="h-10 rounded-xl px-4 py-0 text-xs">{pending ? "กำลังโหลด…" : "แสดงสรุป"}</Button><a className={download} href={"/api/reports/yearly?year=" + fiscalYear}><Sheet className="size-3.5" aria-hidden="true" />CSV · {fiscalYear}</a><a className={download} href={"/api/reports/yearly/pdf?year=" + fiscalYear}><FileDown className="size-3.5" aria-hidden="true" />PDF · {fiscalYear}</a>{form.formState.errors.year && <p role="alert" className="w-full text-xs text-destructive">ปีงบประมาณไม่ถูกต้อง</p>}</form>;
}

type Row = { name: string; count: number };
const features = tableFeatures({});
const helper = createColumnHelper<typeof features, Row>();
const columns = helper.columns([helper.accessor("name", { header: "รายการ" }), helper.accessor("count", { header: "จำนวน" })]);
export function ReportTable({ title, rows }: { title: string; rows: Row[] }) {
  const table = useTable({ features, columns, data: rows });
  return <section className="min-w-0"><h2 className="mb-3 text-sm font-semibold">{title}</h2><table className="w-full text-left text-xs"><thead><tr className="border-b border-border"><th scope="col" className="py-2.5 font-medium text-muted-foreground">รายการ</th><th scope="col" className="py-2.5 text-right font-medium text-muted-foreground">จำนวน</th></tr></thead><tbody>{table.getRowModel().rows.map(({ original: row }) => <tr key={row.name} className="border-b border-border/60"><td className="py-3 pr-3">{row.name}</td><td className="py-3 text-right font-semibold tabular-nums">{row.count.toLocaleString("th-TH")}</td></tr>)}</tbody></table></section>;
}
