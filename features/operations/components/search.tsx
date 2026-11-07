"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { useStore } from "zustand";
import { toast } from "sonner";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createOperationUIStore } from "@/features/operations/stores/operation-ui-store";
import { TimesEditor } from "./times-editor";
import { DetailsEditor } from "./details-editor";
import { RegisterHistory } from "./register-history";
import { OperationTableSkeleton, TeamSkeleton } from "./operations-skeleton";
import { ResponsiveScroll } from "@/components/ui/responsive-scroll";
import { formatThaiDateValue, ThaiDatePicker } from "./thai-date-picker";

type Row = Record<string, unknown>;
const label = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : "—";
const surgeryClassLabel = (value: unknown) => value === "MAJOR" ? "ผ่าตัดใหญ่" : value === "MINOR" ? "ผ่าตัดเล็ก" : "—";
const groupNames: Record<number, string> = { 1: "ผู้ทำการผ่าตัด", 2: "Scrub Nurse", 3: "Instrument Nurse", 4: "Circultate Nurse", 5: "Swab Count Nurse / Nurse Aid / คนงาน / พนักงานห้องผ่าตัด", 0: "ตำแหน่งอื่น" };

const emptyRows: Row[] = [];
const searchSchema = z.object({ date: z.iso.date() });
const features = tableFeatures({});
const column = createColumnHelper<typeof features, Row>();
const columns = column.columns([
  column.accessor("registerNumber", { header: "เลขทะเบียน" }),
  column.accessor("operation_id", { header: "รหัสผ่าตัด" }),
  column.accessor("hn", { header: "HN" }),
  column.accessor("ptname", { header: "ชื่อผู้ป่วย" }),
  column.accessor("surgeryClass", { header: "ประเภทผ่าตัด" }),
  column.accessor("registerUrgency", { header: "ความเร่งด่วน" }),
  column.accessor("status_name", { header: "สถานะ" }),
]);

async function fetchRows(date: string, signal?: AbortSignal): Promise<Row[]> {
  const response = await fetch(`/api/hosxp/operations?date=${encodeURIComponent(date)}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error();
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
  const [uiStore] = useState(createOperationUIStore);
  const { selected, editing, editingDetails, historyId } = useStore(uiStore);
  const setSelected = (value: string) => uiStore.setState({ selected: value });
  const setEditing = (value: string) => uiStore.setState({ editing: value });
  const setEditingDetails = (value: string) => uiStore.setState({ editingDetails: value });
  const setHistoryId = (value: string) => uiStore.setState({ historyId: value });
  const form = useForm<z.infer<typeof searchSchema>>({ resolver: zodResolver(searchSchema), defaultValues: { date: "" } });
  const [resultDate, setResultDate] = useState("");
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const rowsQuery = useQuery({ queryKey: ["operations", resultDate], enabled: Boolean(resultDate), queryFn: ({ signal }) => fetchRows(resultDate, signal) });
  const teamQuery = useQuery({ queryKey: ["operation-team", selected], enabled: Boolean(selected), queryFn: async ({ signal }): Promise<Row[]> => {
    const response = await fetch(`/api/hosxp/operations/${encodeURIComponent(selected)}/team`, { cache: "no-store", signal });
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (!Array.isArray(data.team)) throw new Error();
    return data.team;
  } });
  const rows = rowsQuery.data ?? null;
  const team = teamQuery.data ?? null;
  const loading = rowsQuery.isFetching;
  const teamLoading = teamQuery.isFetching;
  const table = useTable({ features, columns, data: rows ?? emptyRows });
  const setRows = (updater: (current: Row[] | null) => Row[] | null) => queryClient.setQueryData<Row[]>(["operations", resultDate], (current) => updater(current ?? null) ?? undefined);
  const syncMutation = useMutation({ mutationFn: async (day: string) => {
    const response = await fetch("/api/hosxp/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: day }) });
    if (!response.ok) throw new Error();
    return response.json() as Promise<{ created: number; renumbered: number; dateUpdated: number; existing: number }>;
  } });
  const syncing = syncMutation.isPending;

  function search({ date }: z.infer<typeof searchSchema>) {
    setError(""); setSyncMessage("");
    uiStore.setState({ selected: "", editing: "", editingDetails: "", historyId: "" });
    if (date === resultDate) void rowsQuery.refetch();
    else setResultDate(date);
  }

  async function sync() {
    setError(""); setSyncMessage(""); setHistoryId("");
    try {
      const result = await syncMutation.mutateAsync(resultDate);
      setSyncMessage(`เพิ่มใหม่ ${result.created} · ออกเลขใหม่ ${result.renumbered} · เปลี่ยนวันในเดือนเดิม ${result.dateUpdated} · ไม่เปลี่ยนแปลง ${result.existing} รายการ`);
      toast.success("ซิงก์ข้อมูลเข้าทะเบียนแล้ว");
      const refreshed = await rowsQuery.refetch();
      if (refreshed.isError) setError("ซิงก์สำเร็จ แต่ไม่สามารถปรับปรุงผลค้นหาได้ โปรดค้นหาอีกครั้ง");
    } catch { setError("ไม่สามารถซิงก์ได้ โปรดตรวจสอบการเชื่อมต่อหรือติดต่อผู้ดูแลระบบ"); }
  }

  function showTeam(id: string) {
    setError("");
    if (selected === id) void teamQuery.refetch(); else setSelected(id);
  }

  return <section className="mb-[30px] min-w-0 rounded-[18px] border border-border bg-card p-4 sm:p-7">
    <form onSubmit={form.handleSubmit(search)} className="flex flex-wrap items-end gap-3 [&_label]:m-0 [&_label]:w-full [&_label]:min-w-0 [&_button]:m-0 sm:[&_label]:w-auto sm:[&_label]:min-w-[220px]">
      <label className="mt-5 block text-sm font-bold">วันที่ผ่าตัด<Controller control={form.control} name="date" render={({ field }) => <ThaiDatePicker value={field.value} onChange={field.onChange} disabled={loading || syncing} />} /></label>
      <button className="mt-[22px] inline-flex cursor-pointer items-center justify-center gap-8 rounded-[10px] border-0 bg-primary px-5 py-[15px] font-bold text-primary-foreground no-underline hover:bg-primary/90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50" disabled={loading || syncing}>{loading ? "กำลังค้นหา…" : "ค้นหา"}</button>
    </form>
    {(error || rowsQuery.isError || teamQuery.isError || form.formState.errors.date) && <p className="text-sm text-destructive" role="alert">{error || (form.formState.errors.date ? "กรุณาระบุวันที่ผ่าตัดให้ถูกต้อง" : rowsQuery.isError ? "ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบการเชื่อมต่อหรือติดต่อผู้ดูแลระบบ" : "ไม่สามารถดึงข้อมูลทีมผ่าตัดได้")}</p>}
    {loading && <OperationTableSkeleton />}
    {rows && !loading && <div className="mt-[34px] [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2_span]:ml-2 [&_h2_span]:text-[13px] [&_h2_span]:font-normal [&_h2_span]:text-muted-foreground">
      <h2>ผลการค้นหา <span>{formatThaiDateValue(resultDate)} · {rows.length} รายการ</span></h2>
      {rows.length === 0 ? <p className="leading-[1.8] text-muted-foreground">ไม่พบรายการในวันที่เลือก</p> : <>
        <p className="mt-3 text-xs text-muted-foreground md:hidden">เลื่อนตารางไปด้านข้างเพื่อดูข้อมูลและการดำเนินการทั้งหมด</p><ResponsiveScroll label="ตารางผลค้นหาการผ่าตัด เลื่อนด้านข้างได้"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead><tr><th className="border-b border-border px-2.5 py-3.5 font-semibold text-muted-foreground">เลขทะเบียน</th><th className="border-b border-border px-2.5 py-3.5 font-semibold text-muted-foreground">รหัสผ่าตัด</th><th className="border-b border-border px-2.5 py-3.5 font-semibold text-muted-foreground">HN</th><th className="border-b border-border px-2.5 py-3.5 font-semibold text-muted-foreground">ชื่อผู้ป่วย</th><th className="border-b border-border px-2.5 py-3.5 font-semibold text-muted-foreground">ประเภทผ่าตัด</th><th className="border-b border-border px-2.5 py-3.5 font-semibold text-muted-foreground">ความเร่งด่วน</th><th className="border-b border-border px-2.5 py-3.5 font-semibold text-muted-foreground">สถานะ</th><th className="border-b border-border px-2.5 py-3.5 font-semibold text-muted-foreground">การดำเนินการ</th></tr></thead>
          <tbody>{table.getRowModel().rows.map((tableRow, index) => {
            const row = tableRow.original;
            const id = label(row.operation_id);
            return <tr key={`${id}-${index}`}><td className="border-b border-border px-2.5 py-3.5">{row.needsDateSync ? <>เลขเดิม {label(row.registerNumber)}<br /><span className="text-xs text-amber-700 dark:text-amber-300">วันที่เปลี่ยน กรุณาซิงก์</span></> : label(row.registerNumber)}</td><td className="border-b border-border px-2.5 py-3.5">{id}</td><td className="border-b border-border px-2.5 py-3.5">{label(row.hn)}</td><td className="border-b border-border px-2.5 py-3.5">{label(row.ptname)}</td><td className="border-b border-border px-2.5 py-3.5">{surgeryClassLabel(row.surgeryClass)}</td><td className="border-b border-border px-2.5 py-3.5">{label(row.registerNumber != null ? row.registerUrgency : row.emergency_name)}</td><td className="border-b border-border px-2.5 py-3.5">{label(row.status_name)}</td><td className="flex gap-3 whitespace-nowrap border-b border-border px-2.5 py-3.5"><button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50" onClick={() => showTeam(id)} disabled={teamLoading || id === "—"}>ดูทีม</button>{row.registerNumber != null && <button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setHistoryId(id)}>ประวัติเลข</button>}{canSync && row.registerNumber != null && !row.needsDateSync && <><button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50" onClick={() => { setEditingDetails(""); setEditing(id); }}>แก้ไขเวลา</button><button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50" onClick={() => { setEditing(""); setEditingDetails(id); }}>ข้อมูล</button></>}</td></tr>;
          })}</tbody>
        </table></ResponsiveScroll>
        {canSync && <button type="button" className="mt-[22px] inline-flex cursor-pointer items-center justify-center gap-8 rounded-[10px] border-0 bg-primary px-5 py-[15px] font-bold text-primary-foreground no-underline hover:bg-primary/90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50" onClick={sync} disabled={syncing || loading}>{syncing ? "กำลังซิงก์…" : "ซิงก์เข้าทะเบียน"}</button>}
        <p className="leading-[1.8] text-muted-foreground" role="status">{syncMessage}</p>
      </>}
    </div>}
    {selected && <div className="mt-[34px] [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2_span]:ml-2 [&_h2_span]:text-[13px] [&_h2_span]:font-normal [&_h2_span]:text-muted-foreground"><h2>Operation และทีมผ่าตัด <span>รหัส {selected}</span></h2>{teamLoading ? <TeamSkeleton /> : team && (team.length === 0 ? <p className="leading-[1.8] text-muted-foreground">ไม่พบข้อมูลทีมผ่าตัด</p> : <><p className="leading-[1.8] text-muted-foreground">Operation: {[...new Set(team.map((row) => label(row.operation_item_name)).filter((name) => name !== "—"))].join(", ") || "—"}</p>{[1, 2, 3, 4, 5, 0].map((group) => { const members = team.filter((row) => (typeof row.personnelGroup === "number" ? row.personnelGroup : 0) === group); return members.length ? <div key={group}><h3 className="font-semibold">{group ? `กลุ่ม ${group} · ${groupNames[group]}` : groupNames[group]}</h3><ul className="list-none p-0 [&_li]:flex [&_li]:flex-wrap [&_li]:gap-x-5 [&_li]:gap-y-1.5 [&_li]:border-b [&_li]:border-border [&_li]:py-3 [&_li_span]:text-muted-foreground">{members.map((row, index) => <li key={index}><strong>{label(row.doctor_name)}</strong><span>{label(row.position_name)} · {label(row.operation_item_name)}</span></li>)}</ul></div> : null; })}</>)}</div>}
    {editing && <TimesEditor key={editing} operationId={editing} onClose={() => setEditing("")} />}
    {editingDetails && <DetailsEditor key={editingDetails} operationId={editingDetails} onClose={() => setEditingDetails("")} onSaved={(details) => setRows((current) => current?.map((row) => label(row.operation_id) === editingDetails ? { ...row, registerUrgency: details.urgency, surgeryClass: details.surgeryClass } : row) ?? null)} />}
    {historyId && <RegisterHistory key={historyId} operationId={historyId} onClose={() => setHistoryId("")} />}
  </section>;
}
