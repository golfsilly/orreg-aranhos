"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper, createPaginatedRowModel, rowPaginationFeature, tableFeatures, useTable } from "@tanstack/react-table";
import { toast } from "sonner";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, Eye, Search, SquarePen } from "lucide-react";
import { OperationTableSkeleton } from "../shared/operations-skeleton";
import { formatThaiDateValue, ThaiDatePicker } from "../shared/thai-date-picker";
import { OperationsTableControls, type OperationsFilterKey } from "../shared/operations-table-controls";
import { OperationsRegisterDisplay } from "../shared/operations-register-display";
import { OperationRegisterDialog } from "../shared/operation-register-dialog";

import { defaultRegisterPageSize, getRegisterColumns } from "../../lib/register-columns";
import { registerTime } from "../../lib/register-time";
import { sortRegisterRows, type RegisterSortMode } from "../../lib/register-sort";
import { OperationsPagination } from "../shared/operations-pagination";
import { useRegisterColumnVisibility } from "../shared/use-register-column-visibility";

type Row = Record<string, unknown>;
const label = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : "—";
const numberLabel = (value: number) => value.toLocaleString("th-TH");
const surgeryClassLabel = (value: unknown) => value === "MAJOR" ? "ผ่าตัดใหญ่" : value === "MINOR" ? "ผ่าตัดเล็ก" : "—";

const emptyRows: Row[] = [];
const searchSchema = z.object({ date: z.iso.date() });
const features = tableFeatures({ rowPaginationFeature, paginatedRowModel: createPaginatedRowModel() });
const column = createColumnHelper<typeof features, Row>();
const columns = column.columns([
  column.accessor("registerNumber", { header: "เลขทะเบียน" }),
  column.accessor("departmentName", { header: "แผนก" }),
  column.accessor("operation_id", { header: "รหัสผ่าตัด" }),
  column.accessor("hn", { header: "HN" }),
  column.accessor("ptname", { header: "ชื่อผู้ป่วย" }),
  column.accessor("effectiveAge", { header: "อายุ" }),
  column.accessor("ward_name", { header: "Ward" }),
  column.accessor("surgeryClass", { header: "ประเภทผ่าตัด" }),
  column.accessor("registerUrgency", { header: "ความเร่งด่วน" }),
  column.accessor("status_name", { header: "สถานะ" }),
]);

async function fetchRows(date: string, signal?: AbortSignal): Promise<Row[]> {
  const response = await fetch(`/api/hosxp/operations?date=${encodeURIComponent(date)}`, { cache: "no-store", signal });
  if (!response.ok) {
    if (response.status === 403) throw new Error("บัญชีนี้ไม่มีสิทธิ์อ่านทะเบียนผ่าตัด กรุณาติดต่อผู้ดูแลระบบ");
    throw new Error("ไม่สามารถเชื่อมต่อ HOSxP หรือฐานข้อมูล OR-Reg ได้ โปรดตรวจสอบการเชื่อมต่อ");
  }
  const data = await response.json();
  if (!Array.isArray(data.operations)) throw new Error();
  const seen = new Set<string>();
  return data.operations.filter((row: Row) => {
    const id = label(row.operation_id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function OperationsSearch({ canSync }: { canSync: boolean }) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof searchSchema>>({ resolver: zodResolver(searchSchema), defaultValues: { date: "" } });
  const [resultDate, setResultDate] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const registerColumns = getRegisterColumns(departmentFilter === "ALL");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(defaultRegisterPageSize);
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<Record<OperationsFilterKey, string>>({ ward: "ALL", urgency: "ALL", surgeryClass: "ALL", anesthesia: "ALL", room: "ALL" });
  const { columnVisibility, changeColumnVisibility, resetColumnVisibility } = useRegisterColumnVisibility();
  const [error, setError] = useState("");
  const [selectedOperationId, setSelectedOperationId] = useState("");
  const [registerSort, setRegisterSort] = useState<RegisterSortMode>("operationId");
  const [syncMessage, setSyncMessage] = useState("");
  const rowsQuery = useQuery({ queryKey: ["operations", resultDate], enabled: Boolean(resultDate), queryFn: ({ signal }) => fetchRows(resultDate, signal) });
  const rows = rowsQuery.data ?? null;
  const departments = [...new Map((rows ?? []).map((row) => {
    const id = label(row.sourceDepartmentId);
    return [id, { id, name: label(row.departmentName) }];
  })).values()].sort((a, b) => a.name.localeCompare(b.name, "th"));
  const filterOptions = useMemo(() => {
    const values = (key: string) => [...new Set((rows ?? []).map((row) => typeof row[key] === "string" || typeof row[key] === "number" ? String(row[key]).trim() : "").filter((value) => value && value !== "—"))].sort((a, b) => a.localeCompare(b, "th"));
    return { ward: values("ward_name"), urgency: values("emergency_name"), surgeryClass: values("surgeryClass"), anesthesia: values("anesthesia"), room: values("room_name") };
  }, [rows]);
  const visibleRows = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase("th");
    const searchableKeys = ["registerNumber", "operation_id", "hn", "ptname", "effectiveAge", "ward_name", "departmentName", "room_name", "emergency_name", "diagnosis", "wound_names", "surgeryClass", "minorPeriod", "anesthesia", "remark", "status_name"];
    const filtered = (rows ?? []).filter((row) => {
      if (departmentFilter !== "ALL" && label(row.sourceDepartmentId) !== departmentFilter) return false;
      if (filters.ward !== "ALL" && label(row.ward_name) !== filters.ward) return false;
      if (filters.urgency !== "ALL" && label(row.emergency_name) !== filters.urgency) return false;
      if (filters.surgeryClass !== "ALL" && label(row.surgeryClass) !== filters.surgeryClass) return false;
      if (filters.anesthesia !== "ALL" && label(row.anesthesia) !== filters.anesthesia) return false;
      if (filters.room !== "ALL" && label(row.room_name) !== filters.room) return false;
      return !query || searchableKeys.some((key) => (typeof row[key] === "string" || typeof row[key] === "number" ? String(row[key]) : "").toLocaleLowerCase("th").includes(query));
    });
    return sortRegisterRows(filtered, registerSort);
  }, [rows, departmentFilter, searchText, filters, registerSort]);
  const loading = rowsQuery.isFetching;
  const safePageIndex = Math.min(pageIndex, Math.max(0, Math.ceil(visibleRows.length / pageSize) - 1));
  const table = useTable({ features, columns, data: visibleRows ?? emptyRows, state: { pagination: { pageIndex: safePageIndex, pageSize } }, onPaginationChange: (updater) => { const next = typeof updater === "function" ? updater({ pageIndex: safePageIndex, pageSize }) : updater; setPageIndex(next.pageIndex); setPageSize(next.pageSize); } });
  const syncMutation = useMutation({ mutationFn: async (day: string) => {
    const response = await fetch("/api/hosxp/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: day }) });
    if (!response.ok) throw new Error();
    return response.json() as Promise<{ created: number; renumbered: number; dateUpdated: number; departmentUpdated: number; existing: number }>;
  } });
  const syncing = syncMutation.isPending;

  function search({ date }: z.infer<typeof searchSchema>) {
    setError(""); setSyncMessage("");
    setDepartmentFilter("ALL"); setPageIndex(0);
    setSearchText("");
    setFilters({ ward: "ALL", urgency: "ALL", surgeryClass: "ALL", anesthesia: "ALL", room: "ALL" });
    setSelectedOperationId("");
    if (date === resultDate) void rowsQuery.refetch();
    else setResultDate(date);
  }

  async function sync() {
    setError(""); setSyncMessage("");
    try {
      const result = await syncMutation.mutateAsync(resultDate);
      setSyncMessage(`เพิ่มใหม่ ${result.created} · ออกเลขใหม่ ${result.renumbered} · ย้ายแผนก ${result.departmentUpdated} · เปลี่ยนวันในเดือนเดิม ${result.dateUpdated} · ไม่เปลี่ยนแปลง ${result.existing} รายการ`);
      toast.success("ซิงก์ข้อมูลเข้าทะเบียนแล้ว");
      const refreshed = await rowsQuery.refetch();
      if (refreshed.isError) setError("ซิงก์สำเร็จ แต่ไม่สามารถปรับปรุงผลค้นหาได้ โปรดค้นหาอีกครั้ง");
    } catch { setError("ไม่สามารถซิงก์ได้ โปรดตรวจสอบการเชื่อมต่อหรือติดต่อผู้ดูแลระบบ"); }
  }

  const resetColumns = () => { resetColumnVisibility(); window.dispatchEvent(new Event("orreg-reset-register-column-order")); };
  const clearFilters = () => { setSearchText(""); setDepartmentFilter("ALL"); setFilters({ ward: "ALL", urgency: "ALL", surgeryClass: "ALL", anesthesia: "ALL", room: "ALL" }); };
  const cellForColumn = (id: string, row: Row) => {
    switch (id) {
      case "number": return typeof row.registerNumber !== "string" || row.needsDateSync ? <span className="text-xs font-medium text-amber-700 dark:text-amber-300">รอจัดทะเบียน</span> : label(row.registerNumber);
      case "operationId": return <span className="font-mono text-xs tabular-nums text-muted-foreground">{label(row.operation_id)}</span>;
      case "hn": return label(row.hn);
      case "patient": return label(row.ptname);
      case "age": return label(row.effectiveAge);
      case "ward": return label(row.ward_name);
      case "operationDate": return formatThaiDateValue(typeof row.request_operation_date === "string" ? row.request_operation_date.slice(0, 10) : resultDate);
      case "startTime": return <div className="flex min-h-12 whitespace-nowrap">{Boolean(row.operationStartedAtEdited) && <span aria-label="แก้ไขจาก HOSxP แล้ว" className="w-1.5 shrink-0 bg-emerald-600 dark:bg-emerald-400" />}<span title={registerTime(row.effectiveOperationStartedAt, true)} className="px-2.5 py-3.5">{registerTime(row.effectiveOperationStartedAt)}</span></div>;
      case "endTime": return <div className="flex min-h-12 whitespace-nowrap">{Boolean(row.operationEndedAtEdited) && <span aria-label="แก้ไขจาก HOSxP แล้ว" className="w-1.5 shrink-0 bg-emerald-600 dark:bg-emerald-400" />}<span title={registerTime(row.effectiveOperationEndedAt, true)} className="px-2.5 py-3.5">{registerTime(row.effectiveOperationEndedAt)}</span></div>;
      case "department": return <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{label(row.departmentName)}</span>;
      case "room": return label(row.room_name);
      case "urgency": return label(row.emergency_name);
      case "diagnosis": return <span className="block max-w-[300px] truncate" title={label(row.diagnosis)}>{label(row.diagnosis)}</span>;
      case "wound": return label(row.wound_names);
      case "surgeryClass": return `${surgeryClassLabel(row.surgeryClass)}${row.surgeryClass === "MINOR" ? ` · ${label(row.minorPeriod)}` : ""}`;
      case "preOp": return row.preOp ? "✓" : "—";
      case "postOp": return row.postOp ? "✓" : "—";
      case "patho": return row.patho ? "✓" : "—";
      case "anesthesia": return label(row.anesthesia);
      case "remark": return <span className="block max-w-[240px] truncate" title={label(row.remark)}>{label(row.remark)}</span>;
      case "status": return label(row.status_name);
      case "actions": return <button type="button" onClick={() => setSelectedOperationId(label(row.operation_id))} title={canSync ? "ดูและแก้ไขทะเบียน" : "ดูรายละเอียดทะเบียน"} aria-label={canSync ? "ดูและแก้ไขทะเบียน" : "ดูรายละเอียดทะเบียน"} className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-background text-primary shadow-sm transition hover:border-primary/30 hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring">{canSync ? <SquarePen aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}</button>;
    }
  };

  return <section className="mb-6 min-w-0 space-y-4">
    <form onSubmit={form.handleSubmit(search)} className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarDays aria-hidden="true" className="size-4" /></span><span><span className="block text-sm font-semibold">ค้นหาทะเบียนรายวัน</span><span className="mt-0.5 block text-[11px] text-muted-foreground">เลือกวันที่ผ่าตัดเพื่อดูรายการจาก HOSxP</span></span></div>
      <div className="grid gap-3 sm:grid-cols-[minmax(240px,1fr)_auto] sm:items-end">
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted-foreground">วันที่ผ่าตัด<Controller control={form.control} name="date" render={({ field }) => <ThaiDatePicker value={field.value} onChange={field.onChange} disabled={loading || syncing} />} /></label>
        <button className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-32" disabled={loading || syncing}>{loading ? <><span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />กำลังค้นหา…</> : <><Search aria-hidden="true" className="size-4" />ค้นหา</>}</button>
      </div>
    </form>
    {(error || rowsQuery.isError || form.formState.errors.date) && <p className="text-sm text-destructive" role="alert">{error || (form.formState.errors.date ? "กรุณาระบุวันที่ผ่าตัดให้ถูกต้อง" : rowsQuery.isError ? rowsQuery.error instanceof Error ? rowsQuery.error.message : "ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบการเชื่อมต่อหรือติดต่อผู้ดูแลระบบ" : "ไม่สามารถดึงข้อมูลได้")}</p>}
    {loading && <OperationTableSkeleton />}
    {rows && !loading && <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h2 className="m-0 text-base font-semibold tracking-tight">ผลการค้นหา</h2><p className="mb-0 mt-1 text-xs text-muted-foreground">{formatThaiDateValue(resultDate)} <span className="mx-1.5 text-border">·</span> แสดง {numberLabel(visibleRows.length)} จาก {numberLabel(rows.length)} รายการ</p></div><div className="grid grid-cols-2 gap-2 sm:flex"><a className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground no-underline transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" href={`/api/reports/daily/pdf?date=${encodeURIComponent(resultDate)}`} target="_blank" rel="noreferrer">พิมพ์ / PDF</a><a className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground no-underline transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" href={`/api/reports/daily/excel?date=${encodeURIComponent(resultDate)}`} target="_blank" rel="noreferrer">ส่งออก Excel</a></div></div>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="กรองทะเบียนตามแผนก"><button type="button" onClick={() => { setDepartmentFilter("ALL"); setPageIndex(0); }} aria-pressed={departmentFilter === "ALL"} className={`rounded-full border px-3.5 py-2 text-sm font-semibold ${departmentFilter === "ALL" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted"}`}>ทุกแผนก <span className="opacity-75">{rows.length}</span></button>{departments.map((department) => { const count = rows.filter((row) => label(row.sourceDepartmentId) === department.id).length; return <button type="button" key={department.id} onClick={() => { setDepartmentFilter(department.id); setPageIndex(0); }} aria-pressed={departmentFilter === department.id} className={`rounded-full border px-3.5 py-2 text-sm font-semibold ${departmentFilter === department.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted"}`}>{department.name} <span className="opacity-75">{count}</span></button>; })}</div><OperationsTableControls search={searchText} onSearchChange={(value) => { setSearchText(value); setPageIndex(0); }} filters={filters} onFilterChange={(key, value) => { setFilters((current) => ({ ...current, [key]: value })); setPageIndex(0); }} options={filterOptions} columns={registerColumns} visibility={columnVisibility} onVisibilityChange={changeColumnVisibility} onResetColumns={resetColumns} onClearFilters={clearFilters} activeFilterCount={Object.values(filters).filter((value) => value !== "ALL").length + Number(departmentFilter !== "ALL")} />{rows.length === 0 ? <p className="leading-[1.8] text-muted-foreground">ไม่พบรายการในวันที่เลือก</p> : visibleRows?.length === 0 ? <p className="leading-[1.8] text-muted-foreground">ไม่พบรายการที่ตรงกับคำค้นหาหรือตัวกรองที่เลือก</p> : <>
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <OperationsRegisterDisplay rows={table.getRowModel().rows.map((tableRow) => tableRow.original)} columns={registerColumns} visibility={columnVisibility} renderCell={(columnId, row) => cellForColumn(columnId, row)} rowKey={(row) => String(row.operation_id)} label="ทะเบียนผ่าตัดรายวัน" numberSortDirection={registerSort === "numberAsc" ? "asc" : registerSort === "numberDesc" ? "desc" : null} onSortByRegisterNumber={() => { setRegisterSort((current) => current === "numberAsc" ? "numberDesc" : "numberAsc"); setPageIndex(0); }} />
          <div className="border-t border-border/70 bg-muted/15 p-2 sm:p-3"><OperationsPagination pageIndex={safePageIndex} pageSize={pageSize} total={visibleRows.length} onPageChange={setPageIndex} onPageSizeChange={(size) => { setPageSize(size); setPageIndex(0); }} /></div>
        </div>
        {canSync && <button type="button" className="mt-[22px] inline-flex cursor-pointer items-center justify-center gap-8 rounded-[10px] border-0 bg-primary px-5 py-[15px] font-bold text-primary-foreground no-underline hover:bg-primary/90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50" onClick={sync} disabled={syncing || loading}>{syncing ? "กำลังซิงก์…" : "ซิงก์เข้าทะเบียน"}</button>}
        <p className="leading-[1.8] text-muted-foreground" role="status">{syncMessage}</p>
      </>}
    </div>}
    {selectedOperationId && rows?.find((row) => label(row.operation_id) === selectedOperationId) && <OperationRegisterDialog key={selectedOperationId} row={rows.find((row) => label(row.operation_id) === selectedOperationId)!} canEdit={canSync} onClose={() => setSelectedOperationId("")} onChanged={() => { void queryClient.invalidateQueries({ queryKey: ["operations", resultDate] }); void queryClient.invalidateQueries({ queryKey: ["operations-month"] }); }} />}
  </section>;
}
