"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { OperationsColumnOption } from "../../lib/register-columns";
export type { OperationsColumnOption } from "../../lib/register-columns";

export type OperationsFilterKey = "ward" | "urgency" | "surgeryClass" | "anesthesia" | "room";

const filterLabels: Record<OperationsFilterKey, string> = {
  ward: "Ward",
  urgency: "ความเร่งด่วน",
  surgeryClass: "ประเภทผ่าตัด",
  anesthesia: "ชนิดการดมยา",
  room: "ห้องผ่าตัด",
};

export function OperationsTableControls({
  search,
  onSearchChange,
  filters,
  onFilterChange,
  options,
  columns,
  visibility,
  onVisibilityChange,
  onResetColumns,
  onClearFilters,
  activeFilterCount,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filters: Record<OperationsFilterKey, string>;
  onFilterChange: (key: OperationsFilterKey, value: string) => void;
  options: Record<OperationsFilterKey, string[]>;
  columns: readonly OperationsColumnOption[];
  visibility: Record<string, boolean>;
  onVisibilityChange: (id: string, visible: boolean) => void;
  onResetColumns: () => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const filterPanelId = useId();
  const visibleColumnCount = columns.filter((column) => visibility[column.id] ?? column.defaultVisible).length;

  return <section aria-label="ค้นหาและปรับมุมมองตาราง" className="mt-5 rounded-2xl border border-border bg-card p-3.5 shadow-sm sm:p-4">
    <div className="flex h-11 min-w-0 items-center gap-2.5 rounded-xl border border-input bg-background px-3.5 transition focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/15">
      <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="เลขทะเบียน, รหัส HOSxP, HN, ชื่อ, Dx, Ward…" className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/75" aria-label="ค้นหาทะเบียนผ่าตัด" />
      {search && <button type="button" onClick={() => onSearchChange("")} className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="ล้างคำค้นหา"><X className="size-4" /></button>}
    </div>

    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-expanded={filtersExpanded} aria-controls={filterPanelId} onClick={() => setFiltersExpanded((expanded) => !expanded)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <SlidersHorizontal aria-hidden="true" className="size-4 text-primary" />
          <span>{filtersExpanded ? "ย่อตัวกรอง" : "แสดงตัวกรอง"}</span>
          {activeFilterCount > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">{activeFilterCount}</span>}
          {filtersExpanded ? <ChevronUp aria-hidden="true" className="size-4 text-muted-foreground" /> : <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />}
        </button>
        {activeFilterCount > 0 && <button type="button" onClick={onClearFilters} className="h-10 rounded-xl px-3 text-xs font-semibold text-primary transition hover:bg-primary/10">ล้างตัวกรอง</button>}
      </div>

      <details className="group relative z-20">
        <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-sm font-semibold text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="hidden sm:inline">ซ่อน / แสดงคอลัมน์</span><span className="sm:hidden">คอลัมน์</span><span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">{visibleColumnCount}/{columns.length}</span>
        </summary>
        <div className="absolute top-[calc(100%+8px)] right-0 z-30 w-[min(360px,calc(100vw-2.5rem))] rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-xl">
          <div className="flex items-start justify-between gap-3"><div><h3 className="m-0 text-sm font-bold">คอลัมน์ในตาราง</h3><p className="mb-0 mt-1 text-xs text-muted-foreground">เลือกข้อมูลที่ต้องการแสดง</p></div><button type="button" onClick={onResetColumns} className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">คืนค่าเริ่มต้น</button></div>
          <div className="mt-3 grid max-h-72 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {columns.map((column) => <label key={column.id} title={column.id === "actions" ? "คอลัมน์จัดการถูกตรึงไว้ลำดับแรก" : undefined} className={`flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm ${column.id === "actions" ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-muted"}`}><Checkbox checked={visibility[column.id] ?? column.defaultVisible} disabled={column.id === "actions"} onCheckedChange={(checked) => onVisibilityChange(column.id, checked)} aria-label={column.label} /><span>{column.label}{column.id === "actions" ? " · ล็อก" : ""}</span></label>)}
          </div>
          <div className="mt-3 border-t border-border pt-3"><button type="button" onClick={() => columns.forEach((column) => onVisibilityChange(column.id, true))} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">แสดงทุกคอลัมน์</button></div>
        </div>
      </details>
    </div>

    <div id={filterPanelId} className={filtersExpanded ? "mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-3" : "hidden"}>
      {(Object.keys(filterLabels) as OperationsFilterKey[]).map((key) => <label key={key} className="block min-w-0">
        <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{filterLabels[key]}</span>
        <select value={filters[key]} onChange={(event) => onFilterChange(key, event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/20">
          <option value="ALL">ทั้งหมด</option>
          {options[key].map((value) => <option key={value} value={value}>{key === "surgeryClass" ? value === "MAJOR" ? "ผ่าตัดใหญ่" : value === "MINOR" ? "ผ่าตัดเล็ก" : value : value}</option>)}
        </select>
      </label>)}
      {activeFilterCount > 0 && <p className="m-0 self-end pb-3 text-xs text-muted-foreground sm:col-span-2 xl:col-span-1" aria-live="polite">กำลังใช้ตัวกรอง {activeFilterCount} รายการ</p>}
    </div>
    {!filtersExpanded && <p className="mb-0 mt-2 text-xs text-muted-foreground" aria-live="polite">{activeFilterCount > 0 ? `ซ่อนตัวกรองแล้ว · ใช้งานอยู่ ${activeFilterCount} รายการ` : "ตัวกรองถูกย่อไว้"}</p>}
  </section>;
}
