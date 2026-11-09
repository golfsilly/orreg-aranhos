"use client";

import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Tabs } from "@base-ui/react/tabs";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Clock3, FilePenLine, History, Stethoscope, UserRound, UsersRound } from "lucide-react";
import { useState } from "react";
import { registerTime } from "../../lib/register-time";
import { DetailsEditor } from "../editors/details-editor";
import { RegisterHistory } from "../editors/register-history";
import { TimesEditor } from "../editors/times-editor";
import { OperationTeamDisplay } from "./operation-team-display";
import { TeamSkeleton } from "./operations-skeleton";
import { formatThaiDateValue } from "./thai-date-picker";

type Row = Record<string, unknown>;
type RegisterDetailTab = "information" | "surgery-team" | "anesthesia-team";
const text = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "—";
const source = (value: unknown) => (typeof value === "string" ? value : null);
const anesthesiaDateTime = (value: unknown) => {
  if (typeof value !== "string") return text(value);
  const match = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::\d{2})?)?$/.exec(
    value.trim(),
  );
  return match
    ? `${formatThaiDateValue(match[1]!)}${match[2] ? ` ${match[2]} น.` : ""}`
    : value;
};
const anesthesiaStaffRoleStyle = (value: unknown) => {
  const role = typeof value === "string" ? value : "";
  if (role.includes("ควบคุม")) return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300";
  if (role.includes("ดมยา")) return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300";
  return "border-border bg-background text-muted-foreground";
};
const anesthesiaStaffRoleOrder = (value: unknown) => {
  const role = typeof value === "string" ? value : "";
  return role.includes("ควบคุม") ? 0 : role.includes("ดมยา") ? 1 : 2;
};

export function OperationRegisterDialog({
  row,
  canEdit,
  onClose,
  onChanged,
}: {
  row: Row;
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const operationId = text(row.operation_id);
  const [view, setView] = useState<"read" | "times" | "details" | "history">(
    "read",
  );
  const [tabState, setTabState] = useState<{
    operationId: string;
    value: RegisterDetailTab;
  }>({ operationId, value: "information" });
  const activeTab = tabState.operationId === operationId
    ? tabState.value
    : "information";
  const team = useQuery({
    queryKey: ["operation-team", operationId],
    enabled: view === "read",
    queryFn: async ({ signal }): Promise<Row[]> => {
      const response = await fetch(
        `/api/hosxp/operations/${encodeURIComponent(operationId)}/team`,
        { cache: "no-store", signal },
      );
      if (!response.ok) throw new Error("โหลดทีมผ่าตัดไม่สำเร็จ");
      const data = await response.json();
      if (!Array.isArray(data.team)) throw new Error("โหลดทีมผ่าตัดไม่สำเร็จ");
      return data.team;
    },
  });
  const anesthesia = useQuery({
    queryKey: ["operation-anesthesia", operationId],
    enabled: view === "read",
    queryFn: async ({
      signal,
    }): Promise<{ records: Row[]; assessment: Row | null; staff: Row[] }> => {
      const response = await fetch(
        `/api/hosxp/operations/${encodeURIComponent(operationId)}/anesthesia`,
        { cache: "no-store", signal },
      );
      if (!response.ok) throw new Error("อ่านข้อมูลวิสัญญีจาก HOSxP ไม่สำเร็จ");
      return response.json();
    },
  });
  const anesthesiaStaff = [...(anesthesia.data?.staff ?? [])].sort(
    (a, b) =>
      anesthesiaStaffRoleOrder(a.position_name) -
      anesthesiaStaffRoleOrder(b.position_name),
  );
  const closeEditor = () => {
    setView("read");
    onChanged();
  };
  if (view === "times" && canEdit)
    return (
      <TimesEditor
        operationId={operationId}
        operationDate={source(row.request_operation_date)?.slice(0, 10)}
        sourceStartedAt={source(row.sourceOperationStartedAt)}
        sourceEndedAt={source(row.sourceOperationEndedAt)}
        onClose={closeEditor}
      />
    );
  if (view === "details" && canEdit)
    return (
      <DetailsEditor
        operationId={operationId}
        onClose={closeEditor}
        onSaved={onChanged}
      />
    );
  if (view === "history")
    return (
      <RegisterHistory
        operationId={operationId}
        onClose={() => setView("read")}
      />
    );

  const details = [
    ["HN", text(row.hn)],
    ["ชื่อผู้ป่วย", text(row.ptname)],
    ["อายุ", text(row.effectiveAge)],
    ["แผนก", text(row.departmentName)],
    ["Ward", text(row.ward_name)],
    ["ห้องผ่าตัด", text(row.room_name)],
    [
      "วันที่ผ่าตัด",
      typeof row.request_operation_date === "string"
        ? formatThaiDateValue(row.request_operation_date.slice(0, 10))
        : "—",
    ],
    ["เวลาเข้าห้องผ่าตัด", registerTime(row.roomEnteredAt, true)],
    ["เวลาออกจากห้องผ่าตัด", registerTime(row.roomExitedAt, true)],
    ["เวลาเริ่มผ่า", registerTime(row.effectiveOperationStartedAt, true)],
    ["เวลาผ่าเสร็จ", registerTime(row.effectiveOperationEndedAt, true)],
    ["ความเร่งด่วน", text(row.emergency_name)],
    [
      "Diagnosis",
      text(row.diagnosis) === "—" ? "ยังไม่ได้บันทึก" : text(row.diagnosis),
    ],
    [
      "ประเภทผ่าตัด",
      row.surgeryClass === "MAJOR"
        ? "ผ่าตัดใหญ่"
        : row.surgeryClass === "MINOR"
          ? `ผ่าตัดเล็ก · ${row.minorPeriod === "OFFICIAL_HOURS" ? "ในเวลาราชการ" : row.minorPeriod === "OUTSIDE_HOURS" ? "นอกเวลาราชการ" : "—"}`
          : "—",
    ],
    ["ชนิดการดมยา", text(row.anesthesia)],
    ["ลักษณะแผล", text(row.wound_names)],
    ["Pre-op", row.preOp ? "✓" : "—"],
    ["Post-op", row.postOp ? "✓" : "—"],
    ["Patho", row.patho ? "✓" : "—"],
    ["หมายเหตุ", text(row.remark) || "—"],
  ];
  const registered = row.registerNumber != null && !row.needsDateSync;
  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="รายละเอียดทะเบียนผ่าตัด"
      description={`เลขทะเบียน ${text(row.registerNumber)} · รหัส HOSxP ${operationId}`}
    >
      <Tabs.Root
        value={activeTab}
        onValueChange={(value) =>
          setTabState({ operationId, value: value as RegisterDetailTab })
        }
        className="space-y-4"
      >
        <Tabs.List aria-label="หมวดหมู่รายละเอียดทะเบียนผ่าตัด" className="grid grid-cols-3 gap-1 rounded-2xl border border-border/80 bg-muted/55 p-1.5 shadow-inner">
          <Tabs.Tab value="information" className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs font-semibold text-muted-foreground transition data-[active]:bg-card data-[active]:text-primary data-[active]:shadow-sm sm:text-sm"><ClipboardList aria-hidden="true" className="size-4 shrink-0"/><span>ข้อมูล</span></Tabs.Tab>
          <Tabs.Tab value="surgery-team" className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs font-semibold text-muted-foreground transition data-[active]:bg-card data-[active]:text-primary data-[active]:shadow-sm sm:text-sm"><UsersRound aria-hidden="true" className="size-4 shrink-0"/><span>ทีมผ่าตัด</span></Tabs.Tab>
          <Tabs.Tab value="anesthesia-team" className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs font-semibold text-muted-foreground transition data-[active]:bg-card data-[active]:text-primary data-[active]:shadow-sm sm:text-sm"><Stethoscope aria-hidden="true" className="size-4 shrink-0"/><span>ทีมวิสัญญี</span></Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="information" className="min-h-40 focus-visible:outline-none">      <dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div
            key={label}
            className="min-w-0 rounded-xl border border-border bg-muted/25 p-3"
          >
            <dt className="text-[11px] font-semibold text-muted-foreground">
              {label}
            </dt>
            <dd className="m-0 mt-1 break-words text-sm leading-6">{value}</dd>
          </div>
        ))}
      </dl>        </Tabs.Panel>
        <Tabs.Panel value="surgery-team" className="min-h-40 focus-visible:outline-none">      <section aria-label="ทีมผ่าตัด" className="border-t border-border pt-4">
        <h3 className="mb-3 mt-0 text-sm font-semibold">
          Operation และทีมผ่าตัด
        </h3>
        {team.isPending ? (
          <TeamSkeleton />
        ) : team.isError ? (
          <p role="alert" className="text-sm text-destructive">
            โหลดทีมผ่าตัดไม่สำเร็จ
          </p>
        ) : team.data.length ? (
          <OperationTeamDisplay team={team.data} />
        ) : (
          <p className="text-sm text-muted-foreground">ไม่พบข้อมูลทีมผ่าตัด</p>
        )}
      </section>        </Tabs.Panel>
        <Tabs.Panel value="anesthesia-team" className="min-h-40 focus-visible:outline-none">      <section aria-label="ข้อมูลวิสัญญีจาก HOSxP" className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-emerald-50/70 via-card to-card shadow-sm dark:border-emerald-300/10 dark:from-emerald-950/20">
        <div className="flex items-center gap-3 border-b border-emerald-900/10 px-4 py-4 dark:border-emerald-300/10 sm:px-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Stethoscope aria-hidden="true" className="size-5" /></span>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="m-0 text-sm font-semibold tracking-tight">ข้อมูลวิสัญญี</h3><span className="rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">HOSxP · อ่านอย่างเดียว</span></div><p className="mb-0 mt-1 text-[11px] text-muted-foreground">รหัสผ่าตัด <span className="font-mono font-medium tabular-nums text-foreground">{operationId}</span></p></div>
        </div>
        <div className="space-y-3 p-3.5 sm:p-5">
          {anesthesia.isPending ? <div className="grid gap-2 sm:grid-cols-2"><div className="h-24 animate-pulse rounded-xl bg-muted"/><div className="h-24 animate-pulse rounded-xl bg-muted"/></div> : anesthesia.isError ? <p role="alert" className="m-0 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">อ่านข้อมูลวิสัญญีจาก HOSxP ไม่สำเร็จ</p> : <>
            {anesthesia.data.assessment && <section className="rounded-xl border border-border/80 bg-background/75 p-3.5 dark:bg-background/40 sm:p-4"><div className="mb-3 flex items-center justify-between gap-3"><h4 className="m-0 text-xs font-semibold">การประเมินก่อนดมยา</h4><span className="rounded-lg bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">Pre-anesthesia</span></div><dl className="mb-0 grid grid-cols-2 gap-2 sm:grid-cols-3">{[["Physical status", anesthesia.data.assessment.physical_status], ["ASA", anesthesia.data.assessment.asa_name], ["ASA No.", anesthesia.data.assessment.asa_no], ["Depth", anesthesia.data.assessment.asa_depth], ["LV Grade", anesthesia.data.assessment.lv_grade], ["LV Grade ย่อย", anesthesia.data.assessment.lv_grade_sub], ["Technique 1", anesthesia.data.assessment.technique1_name], ["Technique 2", anesthesia.data.assessment.technique2_name], ["ชื่อวิสัญญีแพทย์", anesthesia.data.assessment.anesthesiologist]].map(([name, value]) => <div key={String(name)} className="min-w-0 rounded-lg bg-muted/40 px-2.5 py-2 dark:bg-muted/25"><dt className="truncate text-[10px] font-medium text-muted-foreground">{String(name)}</dt><dd className="m-0 mt-1 break-words text-xs font-semibold leading-5 text-foreground">{text(value)}</dd></div>)}</dl></section>}
            {anesthesia.data.records.length > 0 && <section className="rounded-xl border border-border/80 bg-background/75 p-3.5 dark:bg-background/40 sm:p-4"><div className="mb-3 flex items-center justify-between gap-3"><h4 className="m-0 text-xs font-semibold">รายการวิสัญญี</h4><span className="rounded-lg bg-muted px-2 py-1 text-[10px] font-medium tabular-nums text-muted-foreground">{anesthesia.data.records.length} รายการ</span></div><div className="divide-y divide-border/70">{anesthesia.data.records.map((record, index) => <article key={String(record.anes_id ?? index)} className="py-3 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1"><div className="flex min-w-0 items-center gap-2"><span className="grid size-6 shrink-0 place-items-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">{index + 1}</span><h5 className="m-0 truncate text-sm font-semibold">{text(record.anesthesia_name)}</h5></div><span className="pl-8 text-[11px] tabular-nums text-muted-foreground sm:pl-0">{anesthesiaDateTime(record.begin_date_time)} – {anesthesiaDateTime(record.end_date_time)}</span></div><dl className="mb-0 mt-2 grid gap-x-4 gap-y-2 pl-8 text-xs sm:grid-cols-[minmax(0,1fr)_auto_auto]"><div className="min-w-0"><dt className="text-[10px] text-muted-foreground">หมายเหตุ</dt><dd className="m-0 mt-0.5 break-words">{text(record.anes_note)}</dd></div><div><dt className="text-[10px] text-muted-foreground">DF icode</dt><dd className="m-0 mt-0.5 font-medium">{text(record.df_icode)}</dd></div><div><dt className="text-[10px] text-muted-foreground">DF price</dt><dd className="m-0 mt-0.5 font-medium tabular-nums">{text(record.df_price)}</dd></div></dl></article>)}</div></section>}
            {anesthesiaStaff.length > 0 && <section className="rounded-xl border border-border/80 bg-background/75 p-3.5 dark:bg-background/40 sm:p-4"><div className="mb-3 flex items-center justify-between gap-3"><div><h4 className="m-0 text-xs font-semibold">บุคลากรวิสัญญี</h4><p className="mb-0 mt-0.5 text-[10px] text-muted-foreground">เจ้าหน้าที่ตามที่บันทึกใน HOSxP</p></div><span className="rounded-lg bg-muted px-2 py-1 text-[10px] font-medium tabular-nums text-muted-foreground">{anesthesiaStaff.length} คน</span></div><ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">{anesthesiaStaff.map((member, index) => <li key={String(member.operation_anes_doctor_id ?? index)} className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border/60 bg-muted/25 px-3 py-2"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><UserRound aria-hidden="true" className="size-3.5"/></span><span className="min-w-0 flex-1 truncate text-xs font-medium">{text(member.doctor_name)}</span><span className={`max-w-[48%] shrink-0 truncate rounded-md border px-2.5 py-1 text-[10px] font-semibold ${anesthesiaStaffRoleStyle(member.position_name)}`}>{text(member.position_name)}</span></li>)}</ul></section>}
            {!anesthesia.data.assessment && !anesthesia.data.records.length && !anesthesia.data.staff.length && <p className="m-0 rounded-xl border border-dashed border-border bg-background/60 p-5 text-center text-sm text-muted-foreground">ไม่พบข้อมูลวิสัญญีของรายการนี้ใน HOSxP</p>}
          </>}
        </div>
      </section>        </Tabs.Panel>
      </Tabs.Root>
      {((canEdit && registered) || row.registerNumber != null) && (
        <div
          role="group"
          aria-label="จัดการทะเบียนผ่าตัด"
          className="my-5 grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-muted/30 p-2 sm:flex sm:items-center"
        >
          {canEdit && registered && (
            <>
              <Button
                size="sm"
                aria-label="บันทึกข้อมูลเพิ่มเติม"
                onClick={() => setView("details")}
                className="col-span-2 h-11 min-w-0 gap-2 rounded-xl px-4 text-[13px] font-semibold shadow-sm shadow-primary/15 transition hover:shadow-md hover:shadow-primary/15 sm:h-10"
              >
                <FilePenLine aria-hidden="true" className="size-4 shrink-0" />
                <span>ข้อมูลเพิ่มเติม</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setView("times")}
                className="h-11 min-w-0 gap-2 rounded-xl border border-border bg-card px-3 text-[13px] font-semibold text-foreground shadow-xs hover:border-primary/25 hover:bg-primary/5 sm:h-10"
              >
                <Clock3
                  aria-hidden="true"
                  className="size-4 shrink-0 text-primary"
                />
                <span>แก้เวลา</span>
              </Button>
            </>
          )}
          {row.registerNumber != null && (
            <Button
              size="sm"
              variant="ghost"
              aria-label="ประวัติเลขทะเบียน"
              title="ประวัติเลขทะเบียน"
              onClick={() => setView("history")}
              className={`h-11 min-w-0 gap-2 rounded-xl px-3 text-[13px] font-medium text-muted-foreground hover:bg-card hover:text-foreground sm:ml-auto sm:h-10 ${canEdit && registered ? "" : "col-span-2"}`}
            >
              <History aria-hidden="true" className="size-4 shrink-0" />
              <span>ประวัติเลข</span>
            </Button>
          )}
        </div>
      )}
      {!registered && (
        <p className="my-4 rounded-xl border border-border bg-muted/30 p-3 text-xs leading-6 text-muted-foreground">
          รายการนี้ยังไม่พร้อมแก้ไข กรุณาซิงก์ทะเบียนให้ตรงกับข้อมูล HOSxP ก่อน
        </p>
      )}

    </AppDialog>
  );
}



