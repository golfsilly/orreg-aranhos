"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { registerPageSizes } from "../../lib/register-columns";

export function OperationsPagination({ pageIndex, pageSize, total, onPageChange, onPageSizeChange }: {
  pageIndex: number; pageSize: number; total: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(pageIndex, pageCount - 1);
  const pages = [...new Set([0, pageCount - 1, current - 1, current, current + 1].filter((page) => page >= 0 && page < pageCount))].sort((a, b) => a - b);
  const number = (value: number) => value.toLocaleString("th-TH");
  const first = total ? current * pageSize + 1 : 0;
  const last = Math.min((current + 1) * pageSize, total);
  const iconButton = "hidden size-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-40 sm:inline-flex";
  const stepButton = "inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-background px-2.5 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/40 disabled:pointer-events-none disabled:opacity-40";

  return <nav aria-label="แบ่งหน้าทะเบียนผ่าตัด" className="mt-4 flex flex-col gap-3 rounded-2xl border border-border/70 bg-linear-to-br from-muted/45 to-background p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
    <p className="m-0 text-center text-xs font-medium text-muted-foreground sm:text-left">แสดง <span className="font-semibold text-foreground">{number(first)}–{number(last)}</span> จาก <span className="font-semibold text-foreground">{number(total)}</span> รายการ <span className="hidden sm:inline">· หน้า {number(current + 1)} จาก {number(pageCount)}</span></p>
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <label className="mr-1 flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground shadow-sm">แถว
        <select aria-label="จำนวนรายการต่อหน้า" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="h-7 rounded-lg bg-transparent pr-1 text-xs font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">{registerPageSizes.map((size) => <option key={size} value={size}>{number(size)}</option>)}</select>
        <span>รายการ</span>
      </label>
      <button type="button" aria-label="หน้าแรก" onClick={() => onPageChange(0)} disabled={current === 0} className={iconButton}><ChevronsLeft className="size-4" /></button>
      <button type="button" aria-label="หน้าก่อนหน้า" onClick={() => onPageChange(current - 1)} disabled={current === 0} className={stepButton}><ChevronLeft className="size-4" /><span className="hidden sm:inline">ก่อนหน้า</span></button>
      {pages.map((page, index) => <span key={page} className="contents">{index > 0 && pages[index - 1] < page - 1 && <span aria-hidden="true" className="px-0.5 text-muted-foreground">…</span>}<button type="button" aria-label={`หน้า ${page + 1}`} aria-current={current === page ? "page" : undefined} onClick={() => onPageChange(page)} className={`size-9 rounded-xl text-xs font-bold tabular-nums transition ${current === page ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "border border-border bg-background text-foreground shadow-sm hover:border-primary/40 hover:text-primary"}`}>{number(page + 1)}</button></span>)}
      <button type="button" aria-label="หน้าถัดไป" onClick={() => onPageChange(current + 1)} disabled={current >= pageCount - 1} className={stepButton}><span className="hidden sm:inline">ถัดไป</span><ChevronRight className="size-4" /></button>
      <button type="button" aria-label="หน้าสุดท้าย" onClick={() => onPageChange(pageCount - 1)} disabled={current >= pageCount - 1} className={iconButton}><ChevronsRight className="size-4" /></button>
    </div>
  </nav>;
}
