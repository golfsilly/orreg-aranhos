"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper, createPaginatedRowModel, rowPaginationFeature, tableFeatures, useTable } from "@tanstack/react-table";
import { toast } from "sonner";
import { Check, Eye, SquarePen } from "lucide-react";
import { formatThaiDateValue } from "../shared/thai-date-picker";
import { MonthlyRegisterSkeleton } from "../shared/operations-skeleton";
import { OperationsRegisterDisplay } from "../shared/operations-register-display";
import { OperationsTableControls, type OperationsFilterKey } from "../shared/operations-table-controls";

import { defaultRegisterPageSize, getRegisterColumns } from "../../lib/register-columns";
import { registerTime } from "../../lib/register-time";
import { sortRegisterRows, type RegisterSortMode } from "../../lib/register-sort";
import { OperationsPagination } from "../shared/operations-pagination";
import { OperationRegisterDialog } from "../shared/operation-register-dialog";
import { useRegisterColumnVisibility } from "../shared/use-register-column-visibility";

type Row = Record<string, unknown>;
const emptyRows: Row[] = [];
const tableFeatureSet = tableFeatures({ rowPaginationFeature, paginatedRowModel: createPaginatedRowModel() });
const tableColumn = createColumnHelper<typeof tableFeatureSet, Row>();
const tableColumns = tableColumn.columns([tableColumn.accessor("operation_id", { header: "รายการผ่าตัด" })]);
const label = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : "—";
const numberLabel = (value: number) => value.toLocaleString("th-TH");
const surgeryClassLabel = (row: Row) => row.surgeryClass === "MAJOR" ? "ผ่าตัดใหญ่" : row.surgeryClass === "MINOR" ? `ผ่าตัดเล็ก${row.minorPeriod === "OFFICIAL_HOURS" ? " · ในเวลาราชการ" : row.minorPeriod === "OUTSIDE_HOURS" ? " · นอกเวลาราชการ" : ""}` : "—";
const monthlyColumns = getRegisterColumns(false);

function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

function currentFiscalYear() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "2026");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "1");
  return year + 543 + (month >= 10 ? 1 : 0);
}

async function fetchMonth(month: string, signal?: AbortSignal): Promise<Row[]> {
  const response = await fetch(`/api/hosxp/operations?month=${encodeURIComponent(month)}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(response.status === 403 ? "บัญชีนี้ไม่มีสิทธิ์ดูทะเบียนผ่าตัด" : "เชื่อมต่อ HOSxP ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  const result = await response.json();
  if (!Array.isArray(result.operations)) throw new Error("รูปแบบข้อมูลทะเบียนไม่ถูกต้อง");
  const seen = new Set<string>();
  return result.operations.filter((row: Row) => {
    const id = label(row.operation_id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function MonthlyRegisterView({ canSync }: { canSync: boolean }) {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonth);
  const [departmentId, setDepartmentId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<Record<OperationsFilterKey, string>>({ ward: "ALL", urgency: "ALL", surgeryClass: "ALL", anesthesia: "ALL", room: "ALL" });
  const { columnVisibility, changeColumnVisibility, resetColumnVisibility } = useRegisterColumnVisibility();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(defaultRegisterPageSize);
  const [registerSort, setRegisterSort] = useState<RegisterSortMode>("operationId");
  const [selectedOperationId, setSelectedOperationId] = useState("");
  const query = useQuery({ queryKey: ["operations-month", month], queryFn: ({ signal }) => fetchMonth(month, signal), enabled: Boolean(month) });
  const rows = query.data ?? emptyRows;
  const selectedOperation = rows.find((row) => label(row.operation_id) === selectedOperationId);
  const departments = useMemo(() => [...new Map(rows.map((row) => {
    const id = label(row.sourceDepartmentId);
    return [id, { id, name: label(row.departmentName) }];
  })).values()].filter((department) => department.id !== "—").sort((a, b) => a.name.localeCompare(b.name, "th")), [rows]);
  const departmentRows = useMemo(() => rows.filter((row) => label(row.sourceDepartmentId) === departmentId), [rows, departmentId]);
  const filterOptions = useMemo(() => {
    const values = (key: string) => [...new Set(departmentRows.map((row) => typeof row[key] === "string" || typeof row[key] === "number" ? String(row[key]).trim() : "").filter((value) => value && value !== "—"))].sort((a, b) => a.localeCompare(b, "th"));
    return { ward: values("ward_name"), urgency: values("emergency_name"), surgeryClass: values("surgeryClass"), anesthesia: values("anesthesia"), room: values("room_name") };
  }, [departmentRows]);
  const visibleRows = useMemo(() => {
    const filtered = departmentRows
    .filter(() => Boolean(departmentId))
    .filter((row) => filters.ward === "ALL" || label(row.ward_name) === filters.ward)
    .filter((row) => filters.urgency === "ALL" || label(row.emergency_name) === filters.urgency)
    .filter((row) => filters.surgeryClass === "ALL" || label(row.surgeryClass) === filters.surgeryClass)
    .filter((row) => filters.anesthesia === "ALL" || label(row.anesthesia) === filters.anesthesia)
    .filter((row) => filters.room === "ALL" || label(row.room_name) === filters.room)
    .filter((row) => {
      const term = searchText.trim().toLocaleLowerCase("th");
      if (!term) return true;
      return ["registerNumber", "operation_id", "hn", "ptname", "effectiveAge", "ward_name", "departmentName", "room_name", "emergency_name", "diagnosis", "wound_names", "surgeryClass", "minorPeriod", "anesthesia", "remark"]
        .some((key) => (typeof row[key] === "string" || typeof row[key] === "number" ? String(row[key]) : "").toLocaleLowerCase("th").includes(term));
    });
    return sortRegisterRows(filtered, registerSort);
  }, [departmentRows, departmentId, filters, searchText, registerSort]);
  const safePageIndex = Math.min(pageIndex, Math.max(0, Math.ceil(visibleRows.length / pageSize) - 1));
  const table = useTable({
    features: tableFeatureSet,
    columns: tableColumns,
    data: visibleRows,
    state: { pagination: { pageIndex: safePageIndex, pageSize } },
    onPaginationChange: (updater) => {
      const current = { pageIndex: safePageIndex, pageSize };
      const pagination = typeof updater === "function" ? updater(current) : updater;
      setPageIndex(pagination.pageIndex);
      setPageSize(pagination.pageSize);
    },
  });
  const pageRows = table.getRowModel().rows.map((row) => row.original);
  const registered = visibleRows.filter((row) => typeof row.registerNumber === "string" && !row.needsDateSync);
  const departmentRegistered = departmentRows.filter((row) => typeof row.registerNumber === "string" && !row.needsDateSync).length;
  const departmentNeedsNumber = departmentRows.filter((row) => typeof row.registerNumber !== "string" || row.needsDateSync).length;
  const departmentEmergency = departmentRows.filter((row) => label(row.emergency_name).toLocaleLowerCase("th").includes("emergency")).length;
  const sequenceValues = registered.map((row) => Number(String(row.registerNumber).split("/")[0])).filter(Number.isFinite);
  const rangeLabel = !departmentId
    ? "เลือกแผนกเพื่อดูช่วงเลขทะเบียนของแผนกนั้น"
    : sequenceValues.length ? `เลข ${numberLabel(Math.min(...sequenceValues))}–${numberLabel(Math.max(...sequenceValues))} · ${numberLabel(registered.length)} รายการ`
      : "ยังไม่มีเลขทะเบียนของแผนกนี้ในเดือนที่เลือก";
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const firstFiscalYear = 2569;
  const fiscalYearOptions = Array.from({ length: Math.max(0, currentFiscalYear() - firstFiscalYear + 1) }, (_, index) => firstFiscalYear + index);
  const monthName = new Intl.DateTimeFormat("th-TH", { month: "long", timeZone: "Asia/Bangkok" }).format(new Date(Date.UTC(year, monthNumber - 1, 15, 12)));
  const monthTitle = `${monthName} · ปีงบประมาณ ${year + 543 + (monthNumber >= 10 ? 1 : 0)}`;
  const updateMonth = (value: string) => { setMonth(value); setPageIndex(0); setSearchText(""); setFilters({ ward: "ALL", urgency: "ALL", surgeryClass: "ALL", anesthesia: "ALL", room: "ALL" }); };
  const changeSearch = (value: string) => { setSearchText(value); setPageIndex(0); };
  const changeFilter = (key: OperationsFilterKey, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setPageIndex(0); };
  const clearFilters = () => { setSearchText(""); setFilters({ ward: "ALL", urgency: "ALL", surgeryClass: "ALL", anesthesia: "ALL", room: "ALL" }); setPageIndex(0); };
  const resetColumns = () => { resetColumnVisibility(); window.dispatchEvent(new Event("orreg-reset-register-column-order")); };
  const cellForColumn = (id: string, row: Row) => {
    switch (id) {
      case "number": return typeof row.registerNumber !== "string" || row.needsDateSync ? <span className="text-xs font-medium text-amber-700 dark:text-amber-300">รอจัดทะเบียน</span> : label(row.registerNumber);
      case "operationId": return <span className="font-mono text-xs tabular-nums text-muted-foreground">{label(row.operation_id)}</span>;
      case "hn": return label(row.hn);
      case "patient": return label(row.ptname);
      case "age": return label(row.effectiveAge);
      case "ward": return label(row.ward_name);
      case "operationDate": return formatThaiDateValue(typeof row.request_operation_date === "string" ? row.request_operation_date.slice(0, 10) : month + "-01");
      case "startTime": return <div className="flex min-h-12 whitespace-nowrap">{Boolean(row.operationStartedAtEdited) && <span aria-label="เวลาเริ่มผ่าถูกแก้ไข" className="w-1.5 shrink-0 bg-emerald-600 dark:bg-emerald-400" />}<span title={registerTime(row.effectiveOperationStartedAt, true)} className="px-3 py-3.5">{registerTime(row.effectiveOperationStartedAt)}</span></div>;
      case "endTime": return <div className="flex min-h-12 whitespace-nowrap">{Boolean(row.operationEndedAtEdited) && <span aria-label="เวลาผ่าเสร็จถูกแก้ไข" className="w-1.5 shrink-0 bg-emerald-600 dark:bg-emerald-400" />}<span title={registerTime(row.effectiveOperationEndedAt, true)} className="px-3 py-3.5">{registerTime(row.effectiveOperationEndedAt)}</span></div>;
      case "status": return label(row.status_name);
      case "actions": return <button type="button" onClick={() => setSelectedOperationId(label(row.operation_id))} title={canSync ? "ดูและแก้ไขทะเบียน" : "ดูรายละเอียดทะเบียน"} aria-label={canSync ? "ดูและแก้ไขทะเบียน" : "ดูรายละเอียดทะเบียน"} className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-background text-primary shadow-sm transition hover:border-primary/30 hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring">{canSync ? <SquarePen aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}</button>;
      case "room": return label(row.room_name);
      case "urgency": return label(row.emergency_name);
      case "diagnosis": return <span className="block max-w-[320px] truncate" title={label(row.diagnosis)}>{label(row.diagnosis)}</span>;
      case "wound": return <span className="block max-w-[220px] truncate" title={label(row.wound_names)}>{label(row.wound_names)}</span>;
      case "surgeryClass": return surgeryClassLabel(row);
      case "preOp": return <span className="block text-center">{row.preOp ? "✓" : "—"}</span>;
      case "postOp": return <span className="block text-center">{row.postOp ? "✓" : "—"}</span>;
      case "patho": return <span className="block text-center">{row.patho ? "✓" : "—"}</span>;
      case "anesthesia": return label(row.anesthesia);
      case "remark": return <span className="block max-w-[240px] truncate" title={label(row.remark)}>{label(row.remark)}</span>;
    }
  };
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/hosxp/sync/month", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month }) });
      if (!response.ok) throw new Error(response.status === 403 ? "บัญชีนี้ไม่มีสิทธิ์ซิงก์ทะเบียน" : "ซิงก์ข้อมูลทั้งเดือนไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ HOSxP");
      return response.json() as Promise<{ created: number; renumbered: number; dateUpdated: number; departmentUpdated: number; existing: number }>;
    },
    onSuccess: async (result) => {
      toast.success(`ซิงก์ทะเบียนแล้ว · เพิ่ม ${numberLabel(result.created)} · ออกเลขใหม่ ${numberLabel(result.renumbered)} · ย้ายแผนก ${numberLabel(result.departmentUpdated)}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operations-month", month] }),
        queryClient.invalidateQueries({ queryKey: ["operations-calendar-month"] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "ซิงก์ข้อมูลไม่สำเร็จ"),
  });

  return <>
    <Dialog.Root open={syncMutation.isPending} onOpenChange={() => {}}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-[3px]" />
        <Dialog.Popup aria-busy="true" className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[26px] border border-border/80 bg-card p-6 text-card-foreground shadow-2xl shadow-black/20 outline-none sm:p-7">
          <div role="status" className="flex flex-col items-center text-center">
            <span className="relative mb-5 grid size-16 place-items-center rounded-[21px] bg-primary/10 text-primary">
              <span className="absolute inset-0 animate-ping rounded-[21px] bg-primary/10" />
              <span className="relative grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
              </span>
            </span>
            <Dialog.Title className="text-lg font-semibold tracking-tight">กำลังซิงก์ทะเบียนทั้งเดือน</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">กำลังดึงรายการจาก HOSxP และจัดเลขทะเบียนตามแผนก กรุณารอสักครู่</Dialog.Description>
            <div aria-hidden="true" className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/5 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
            </div>
            <p className="mt-3 text-xs font-medium text-muted-foreground">ระหว่างนี้ยังใช้งานหน้าจอไม่ได้</p>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
    <section aria-label="ทะเบียนรายเดือน" className="mt-4 space-y-4">
    <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 md:flex-row md:items-center md:justify-between">
      <div><h2 className="m-0 text-lg font-semibold tracking-tight">ทะเบียนรายเดือน</h2><p className="mb-0 mt-1 text-sm text-muted-foreground">กำหนดเดือนก่อน แล้วเลือกแผนกที่ต้องการดู</p></div>
      <div className="flex flex-wrap gap-2">
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">เดือน
          <select aria-label="เลือกเดือน" value={String(monthNumber).padStart(2, "0")} onChange={(event) => { updateMonth(`${year}-${event.target.value}`); }} className="h-11 min-w-36 rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">{Array.from({ length: 12 }, (_, index) => { const value = index + 1; const name = new Intl.DateTimeFormat("th-TH", { month: "long" }).format(new Date(2020, index, 15)); return <option key={value} value={String(value).padStart(2, "0")}>{name}</option>; })}</select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">ปีงบประมาณ
          <select aria-label="เลือกปีงบประมาณ" value={String(year + 543 + (monthNumber >= 10 ? 1 : 0))} onChange={(event) => { const fiscalYear = Number(event.target.value); const calendarYear = fiscalYear - 543 - (monthNumber >= 10 ? 1 : 0); updateMonth(`${calendarYear}-${String(monthNumber).padStart(2, "0")}`); }} className="h-11 min-w-32 rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">{fiscalYearOptions.map((fiscalYear) => <option key={fiscalYear} value={fiscalYear}>{fiscalYear}</option>)}</select>
        </label>
      </div>
    </header>

    {query.isPending ? <MonthlyRegisterSkeleton /> : query.isError ? <div className="mt-5 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive" role="alert">{query.error instanceof Error ? query.error.message : "โหลดทะเบียนรายเดือนไม่สำเร็จ"}</div> : <>
      <section aria-label="เลือกแผนก" className="w-full rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="m-0 text-sm font-semibold">แผนก</h3><p className="mb-0 mt-0.5 text-[11px] text-muted-foreground">เลือกแผนกเพื่อเปิดทะเบียนรายเดือน</p></div><span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">{numberLabel(departments.length)} แผนก</span></div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-2">
        {departments.map((department) => { const count = rows.filter((row) => label(row.sourceDepartmentId) === department.id).length; const selected = departmentId === department.id; return <button type="button" key={department.id} onClick={() => { setDepartmentId(department.id); setPageIndex(0); }} aria-pressed={selected} className={`group flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? "border-primary/40 bg-primary/[0.07] shadow-sm ring-1 ring-primary/15" : "border-border/80 bg-background hover:border-primary/30 hover:bg-muted/45"}`}><span className={`min-w-0 truncate text-xs font-semibold sm:text-[13px] ${selected ? "text-primary" : "text-foreground"}`}>{department.name}</span><span className="flex shrink-0 items-center gap-1.5">{selected && <Check aria-hidden="true" className="size-3.5 text-primary" />}<span className={`grid min-w-7 place-items-center rounded-lg px-1.5 py-1 text-[10px] font-bold tabular-nums ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"}`}>{numberLabel(count)}</span></span></button>; })}
      </div>
      </section>

      {departmentId && <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { label: "รายการทั้งหมด", value: departmentRows.length, tone: "border-l-slate-400" },
          { label: "มีเลขทะเบียนแล้ว", value: departmentRegistered, tone: "border-l-emerald-600 dark:border-l-emerald-400" },
          { label: "รอจัดเลขทะเบียน", value: departmentNeedsNumber, tone: "border-l-amber-500" },
          { label: "Emergency", value: departmentEmergency, tone: "border-l-rose-500" },
        ].map((metric) => <article key={metric.label} className={`rounded-2xl border border-border border-l-[3px] ${metric.tone} bg-card px-3.5 py-3 shadow-sm sm:px-4 sm:py-3.5`}><p className="m-0 truncate text-[10px] font-semibold text-muted-foreground sm:text-xs">{metric.label}</p><p className="mb-0 mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">{numberLabel(metric.value)}</p></article>)}
      </div>}

      <div className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-primary/[0.045] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-4.5">
        <div className="min-w-0"><p className="m-0 truncate text-sm font-semibold">{departments.find((item) => item.id === departmentId)?.name ?? "เลือกแผนก"}<span className="mx-2 text-muted-foreground/50">/</span><span className="text-muted-foreground">{monthTitle}</span></p><p className="mb-0 mt-1 text-xs text-muted-foreground">{rangeLabel}<span className="mx-2 text-muted-foreground/50">/</span>แสดง {numberLabel(visibleRows.length)} จาก {numberLabel(departmentRows.length)} รายการ</p></div>
        {canSync && <button type="button" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending || rows.length === 0 || !departmentId} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{syncMutation.isPending && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}{syncMutation.isPending ? "กำลังซิงก์เดือนนี้…" : "ซิงก์เดือนนี้ทุกแผนก"}</button>}
      </div>
      {departmentId && <OperationsTableControls search={searchText} onSearchChange={changeSearch} filters={filters} onFilterChange={changeFilter} options={filterOptions} columns={monthlyColumns} visibility={columnVisibility} onVisibilityChange={changeColumnVisibility} onResetColumns={resetColumns} onClearFilters={clearFilters} activeFilterCount={Object.values(filters).filter((value) => value !== "ALL").length} />}

      {departmentId && <div className="mt-6 flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="m-0 text-base font-semibold">รายการผ่าตัด</h3><p className="mb-0 mt-1 text-xs text-muted-foreground">{departments.find((item) => item.id === departmentId)?.name} · {monthTitle} · {numberLabel(visibleRows.length)} รายการ</p></div><div className="flex flex-wrap gap-2"><a className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground no-underline transition hover:bg-muted" href={`/api/reports/monthly/pdf?month=${encodeURIComponent(month)}&department=${encodeURIComponent(departmentId)}`} target="_blank" rel="noreferrer">พิมพ์ / PDF</a><a className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground no-underline transition hover:bg-muted" href={`/api/reports/monthly/excel?month=${encodeURIComponent(month)}&department=${encodeURIComponent(departmentId)}`} target="_blank" rel="noreferrer">Excel</a></div></div>}
      {departments.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card py-12 text-center text-sm text-muted-foreground">ไม่พบรายการผ่าตัดในเดือนที่เลือก</div> : !departmentId ? <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-12 text-center"><p className="m-0 text-sm font-semibold">เลือกแผนกเพื่อเปิดทะเบียน</p><p className="mb-0 mt-1 text-xs text-muted-foreground">รายการประจำเดือนจะแสดงในส่วนนี้</p></div> : visibleRows.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">{searchText.trim() || Object.values(filters).some((value) => value !== "ALL") ? "ไม่พบรายการที่ตรงกับคำค้นหาหรือตัวกรอง" : "ไม่พบรายการผ่าตัดในแผนกและเดือนที่เลือก"}</div> : <>
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <OperationsRegisterDisplay rows={pageRows} columns={monthlyColumns} visibility={columnVisibility} renderCell={(columnId, row) => cellForColumn(columnId, row)} rowKey={(row) => String(row.operation_id)} label={`ทะเบียน ${monthTitle} แยกตามแผนก`} numberSortDirection={registerSort === "numberAsc" ? "asc" : registerSort === "numberDesc" ? "desc" : null} onSortByRegisterNumber={() => { setRegisterSort((current) => current === "numberAsc" ? "numberDesc" : "numberAsc"); setPageIndex(0); }} />
          <div className="border-t border-border/70 bg-muted/15 p-2 sm:p-3"><OperationsPagination pageIndex={safePageIndex} pageSize={pageSize} total={visibleRows.length} onPageChange={setPageIndex} onPageSizeChange={(size) => { setPageSize(size); setPageIndex(0); }} /></div>
        </div>
      </>}
    </>}
    </section>
    {selectedOperation && <OperationRegisterDialog key={selectedOperationId} row={selectedOperation} canEdit={canSync} onClose={() => setSelectedOperationId("")} onChanged={() => { void queryClient.invalidateQueries({ queryKey: ["operations-month", month] }); void queryClient.invalidateQueries({ queryKey: ["operations-calendar-month"] }); void queryClient.invalidateQueries({ queryKey: ["operations"] }); }} />}
  </>;
}
