"use client";

import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Tabs } from "@base-ui/react/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  BedDouble,
  CalendarDays,
  Check,
  ClipboardCheck,
  ClipboardList,
  DoorOpen,
  FilePenLine,
  History,
  MapPin,
  Printer,
  Square,
  Stethoscope,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { registerTime } from "../../lib/register-time";
import { DetailsEditor } from "../editors/details-editor";
import { RegisterHistory } from "../editors/register-history";
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
  if (role.includes("ควบคุม"))
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300";
  if (role.includes("ดมยา"))
    return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300";
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
  const [view, setView] = useState<"read" | "details" | "history">(
    "read",
  );
  const [tabState, setTabState] = useState<{
    operationId: string;
    value: RegisterDetailTab;
  }>({ operationId, value: "information" });
  const activeTab =
    tabState.operationId === operationId ? tabState.value : "information";
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
  const operationItems = useQuery({
    queryKey: ["hosxp-operation-items", operationId],
    enabled: view === "read",
    queryFn: async ({ signal }): Promise<{ operationDetailId: number; operationItemId: number | null; operationItemName: string }[]> => {
      const response = await fetch(
        `/api/hosxp/operations/${encodeURIComponent(operationId)}/items`,
        { cache: "no-store", signal },
      );
      if (!response.ok)
        throw new Error("โหลดรายการ Operation จาก HOSxP ไม่สำเร็จ");
      const data = await response.json();
      if (!Array.isArray(data.operations) || !data.operations.every((item: unknown) =>
        typeof item === "object" && item !== null &&
        Number.isSafeInteger((item as { operationDetailId?: unknown }).operationDetailId) &&
        typeof (item as { operationItemName?: unknown }).operationItemName === "string"
      )) {
        throw new Error("โหลดรายการ Operation จาก HOSxP ไม่สำเร็จ");
      }
      return data.operations;
    },
  });
  const registerDetails = useQuery({
    queryKey: ["register-details", operationId],
    enabled: view === "read",
    queryFn: async ({ signal }): Promise<{ pathoOperationDetailIds: number[] }> => {
      const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/details`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("โหลดรายละเอียดทะเบียนไม่สำเร็จ");
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

  const patientFacts = [
    {
      label: "แผนก",
      value: text(row.departmentName),
      icon: MapPin,
    },
    {
      label: "Ward",
      value: text(row.ward_name),
      icon: BedDouble,
    },
    {
      label: "ห้องผ่าตัด",
      value: text(row.room_name),
      icon: DoorOpen,
    },
    {
      label: "วันที่ผ่าตัด",
      value:
        typeof row.request_operation_date === "string"
          ? formatThaiDateValue(row.request_operation_date.slice(0, 10))
          : "—",
      icon: CalendarDays,
    },
  ];
  const surgeryClass =
    row.surgeryClass === "MAJOR"
      ? "ผ่าตัดใหญ่"
      : row.surgeryClass === "MINOR"
        ? `ผ่าตัดเล็ก · ${row.minorPeriod === "OFFICIAL_HOURS" ? "ในเวลาราชการ" : row.minorPeriod === "OUTSIDE_HOURS" ? "นอกเวลาราชการ" : "ไม่ระบุช่วงเวลา"}`
        : "—";
  const clinicalFacts = [
    {
      label: "Diagnosis",
      value: text(row.diagnosis) === "—" ? "ยังไม่ได้บันทึก" : text(row.diagnosis),
      fullWidth: true,
    },
    { label: "ประเภทผ่าตัด", value: surgeryClass },
    { label: "ชนิดการดมยา", value: text(row.anesthesia) },
    { label: "ลักษณะแผล", value: text(row.wound_names) },
    { label: "หมายเหตุ", value: text(row.remark), fullWidth: true },
  ];
  const careFlags = [
    { label: "Pre-op", active: Boolean(row.preOp) },
    { label: "Post-op", active: Boolean(row.postOp) },
    { label: "ส่งชิ้นเนื้อ", active: Boolean(row.patho) },
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
      eyebrow="OR-REG · SURGERY REGISTER"
      size="wide"
      footer={
        row.registerNumber != null ? (
          <div
            role="group"
            aria-label="จัดการทะเบียนผ่าตัด"
            className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end"
          >
            {registered && (
              <a
                href={`/api/register/${encodeURIComponent(operationId)}/pdf?date=${encodeURIComponent(source(row.request_operation_date)?.slice(0, 10) ?? "")}`}
                target="_blank"
                rel="noreferrer"
                aria-label="พิมพ์ PDF เฉพาะรายการนี้"
                title="พิมพ์ PDF เฉพาะรายการนี้"
                className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground no-underline transition hover:border-primary/25 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring sm:px-4"
              >
                <Printer aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <span>พิมพ์ PDF</span>
              </a>
            )}
            {canEdit && registered && (
              <>
                <Button
                  size="sm"
                  aria-label="บันทึกข้อมูลเพิ่มเติม"
                  onClick={() => setView("details")}
                  className="col-span-2 h-10 min-w-0 gap-2 rounded-xl px-4 text-xs font-semibold shadow-sm shadow-primary/15 sm:order-2 sm:col-span-1"
                >
                  <FilePenLine aria-hidden="true" className="size-4 shrink-0" />
                  <span>ข้อมูลเพิ่มเติม</span>
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
                className="h-10 min-w-0 gap-2 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground sm:order-4 sm:ml-0 sm:px-4"
              >
                <History aria-hidden="true" className="size-4 shrink-0" />
                <span>ประวัติเลข</span>
              </Button>
            )}
          </div>
        ) : (
          <p className="m-0 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5 text-xs leading-5 text-muted-foreground">
            รายการนี้ยังไม่พร้อมแก้ไข กรุณาซิงก์ทะเบียนให้ตรงกับข้อมูล HOSxP ก่อน
          </p>
        )
      }
    >
      <Tabs.Root
        value={activeTab}
        onValueChange={(value) =>
          setTabState({ operationId, value: value as RegisterDetailTab })
        }
        className="space-y-4 sm:space-y-5"
      >
        <Tabs.List
          aria-label="หมวดหมู่รายละเอียดทะเบียนผ่าตัด"
          className="grid grid-cols-3 gap-1 rounded-2xl border border-border/70 bg-muted/55 p-1 shadow-inner sm:gap-1.5 sm:p-1.5"
        >
          <Tabs.Tab
            value="information"
            className="flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[active]:bg-background data-[active]:text-primary data-[active]:shadow-sm data-[active]:ring-1 data-[active]:ring-border/70 sm:min-h-11 sm:gap-2 sm:px-3 sm:text-sm"
          >
            <ClipboardList aria-hidden="true" className="size-4 shrink-0" />
            <span>ข้อมูล</span>
          </Tabs.Tab>
          <Tabs.Tab
            value="surgery-team"
            className="flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[active]:bg-background data-[active]:text-primary data-[active]:shadow-sm data-[active]:ring-1 data-[active]:ring-border/70 sm:min-h-11 sm:gap-2 sm:px-3 sm:text-sm"
          >
            <UsersRound aria-hidden="true" className="size-4 shrink-0" />
            <span>ทีมผ่าตัด</span>
          </Tabs.Tab>
          <Tabs.Tab
            value="anesthesia-team"
            className="flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[active]:bg-background data-[active]:text-primary data-[active]:shadow-sm data-[active]:ring-1 data-[active]:ring-border/70 sm:min-h-11 sm:gap-2 sm:px-3 sm:text-sm"
          >
            <Stethoscope aria-hidden="true" className="size-4 shrink-0" />
            <span>ทีมวิสัญญี</span>
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel
          value="information"
          className="min-h-40 space-y-4 focus-visible:outline-none sm:space-y-5"
        >
          <div className="space-y-4 sm:space-y-5">
            <section
              aria-label="ข้อมูลผู้ป่วยและทะเบียน"
              className="overflow-hidden rounded-[22px] border border-primary/15 bg-gradient-to-br from-primary/[0.075] via-card to-card shadow-sm shadow-primary/[0.035]"
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <p className="m-0 text-[9px] font-bold tracking-[0.16em] text-primary sm:text-[10px]">
                    PATIENT & REGISTER
                  </p>
                  <h3 className="m-0 mt-1.5 break-words text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                    {text(row.ptname)}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/75 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                      <span>HN</span>
                      <span className="font-mono font-semibold tabular-nums text-foreground">
                        {text(row.hn)}
                      </span>
                    </span>
                    <span className="inline-flex items-center rounded-lg border border-border/70 bg-background/75 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                      อายุ{" "}
                      <span className="ml-1 font-semibold text-foreground">
                        {text(row.effectiveAge)}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-background/85 px-3.5 py-2.5 shadow-sm sm:min-w-36 sm:flex-col sm:items-start sm:gap-0">
                  <span className="text-[9px] font-bold tracking-[0.14em] text-muted-foreground">
                    เลขทะเบียน
                  </span>
                  <span className="font-mono text-xl font-bold leading-7 tracking-tight tabular-nums text-primary">
                    {registered ? text(row.registerNumber) : "รอจัดทะเบียน"}
                  </span>
                </div>
              </div>
              <dl className="m-0 grid grid-cols-2 gap-px border-t border-primary/10 bg-border/60 sm:grid-cols-4">
                {patientFacts.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="min-w-0 bg-background/75 px-3.5 py-3 sm:px-4">
                    <dt className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                      <Icon aria-hidden="true" className="size-3.5 text-primary/75" />
                      {label}
                    </dt>
                    <dd className="m-0 mt-1.5 break-words text-xs font-medium leading-5 text-foreground sm:text-sm">
                      {value}
                    </dd>
                  </div>
                ))}
                <div className="col-span-2 min-w-0 bg-background/75 px-3.5 py-3 sm:col-span-4 sm:px-4">
                  <dt className="text-[10px] font-semibold text-muted-foreground">
                    ความเร่งด่วน
                  </dt>
                  <dd className="m-0 mt-1.5">
                    <span
                      className={[
                        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                        text(row.emergency_name).toLowerCase().includes("emergency") ||
                        text(row.emergency_name).includes("ฉุกเฉิน")
                          ? "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                          : "border-primary/15 bg-primary/5 text-primary",
                      ].join(" ")}
                    >
                      {text(row.emergency_name)}
                    </span>
                  </dd>
                </div>
              </dl>
            </section>

            <section aria-label="ช่วงเวลาผ่าตัด">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h3 className="m-0 text-sm font-semibold tracking-tight">
                  ช่วงเวลาผ่าตัด
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  เวลาไทย · 24 ชั่วโมง
                </span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  {
                    label: "เวลาเริ่มผ่า",
                    value: registerTime(row.sourceOperationStartedAt, true),
                  },
                  {
                    label: "เวลาผ่าเสร็จ",
                    value: registerTime(row.sourceOperationEndedAt, true),
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="min-w-0 rounded-2xl border border-border/75 bg-card px-4 py-3.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {label}
                      </span>
                      <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[9px] font-semibold text-primary">HOSxP</span>
                    </div>
                    <p className="m-0 mt-1.5 font-mono text-lg font-semibold tracking-tight tabular-nums text-foreground sm:text-xl">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section
              aria-label="รายการ Operation จาก HOSxP"
              className="rounded-2xl border border-border/75 bg-card p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary">
                    <ClipboardList aria-hidden="true" className="size-[17px]" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="m-0 text-sm font-semibold">Operation</h3>
                    <p className="m-0 mt-0.5 text-[10px] leading-4 text-muted-foreground sm:text-xs">
                      รายการผ่าตัดจาก HOSxP
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {operationItems.data?.length ?? 0} รายการ
                </span>
              </div>
              {operationItems.isPending ? (
                <div
                  className="mt-4 grid gap-2 sm:grid-cols-2"
                  role="status"
                  aria-label="กำลังโหลดรายการ Operation"
                >
                  <div className="h-16 animate-pulse rounded-xl bg-muted" />
                  <div className="h-16 animate-pulse rounded-xl bg-muted" />
                </div>
              ) : operationItems.isError ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                  <p role="alert" className="m-0 text-xs text-destructive">
                    {operationItems.error instanceof Error
                      ? operationItems.error.message
                      : "โหลดรายการ Operation ไม่สำเร็จ"}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void operationItems.refetch()}
                  >
                    ลองอีกครั้ง
                  </Button>
                </div>
              ) : operationItems.data.length ? (
                <ol className="mb-0 mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
                  {operationItems.data.map((operation, index) => (
                    <li
                      key={operation.operationDetailId}
                      className="flex min-w-0 items-start gap-2.5 rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 text-xs leading-5 sm:text-sm"
                    >
                      <span className="grid size-5 shrink-0 place-items-center rounded-md bg-primary/10 text-[9px] font-bold tabular-nums text-primary">
                        {index + 1}
                      </span>
                      <span className="min-w-0 break-words">{operation.operationItemName}</span>
                      {registerDetails.data?.pathoOperationDetailIds.includes(operation.operationDetailId) && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">ส่งชิ้นเนื้อ</span>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mb-0 mt-3 rounded-xl border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
                  ไม่พบรายการ Operation ใน HOSxP
                </p>
              )}
            </section>

            <section
              aria-label="ข้อมูลเพิ่มเติมของทะเบียน"
              className="rounded-2xl border border-border/75 bg-card p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary">
                  <ClipboardCheck aria-hidden="true" className="size-[17px]" />
                </span>
                <div>
                  <h3 className="m-0 text-sm font-semibold">
                    ข้อมูลเพิ่มเติม
                  </h3>
                  <p className="m-0 mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
                    รายละเอียดที่บันทึกไว้ใน OR-Reg
                  </p>
                </div>
              </div>
              <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {clinicalFacts.map(({ label, value, fullWidth }) => (
                  <div
                    key={label}
                    className={[
                      "min-w-0 rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5",
                      fullWidth ? "col-span-2 sm:col-span-3" : "",
                    ].join(" ")}
                  >
                    <dt className="text-[10px] font-semibold text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="m-0 mt-1 break-words text-xs leading-5 text-foreground sm:text-sm">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {careFlags.map(({ label, active }) => (
                  <span
                    key={label}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold",
                      active
                        ? "border-primary/20 bg-primary/8 text-primary"
                        : "border-border/70 bg-background text-muted-foreground",
                    ].join(" ")}
                  >
                    {active ? (
                      <Check aria-hidden="true" className="size-3.5" />
                    ) : (
                      <Square
                        aria-hidden="true"
                        className="size-3.5 opacity-55"
                      />
                    )}
                    {label}
                    <span className="font-medium">
                      {active ? "บันทึกแล้ว" : "ยังไม่บันทึก"}
                    </span>
                  </span>
                ))}
              </div>
            </section>
          </div>
        </Tabs.Panel>
        <Tabs.Panel
          value="surgery-team"
          className="min-h-40 focus-visible:outline-none"
        >
          <section aria-label="ทีมผ่าตัด" className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-border/75 bg-card px-4 py-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary">
                <UsersRound aria-hidden="true" className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <h3 className="m-0 text-sm font-semibold">
                  ทีมผ่าตัด
                </h3>
                <p className="m-0 mt-0.5 text-[10px] leading-4 text-muted-foreground sm:text-xs">
                  บุคลากรและรายการผ่าตัดจาก HOSxP
                </p>
              </div>
            </div>
            {team.isPending ? (
              <TeamSkeleton />
            ) : team.isError ? (
              <p role="alert" className="text-sm text-destructive">
                โหลดทีมผ่าตัดไม่สำเร็จ
              </p>
            ) : team.data.length ? (
              <OperationTeamDisplay team={team.data} />
            ) : (
              <p className="text-sm text-muted-foreground">
                ไม่พบข้อมูลทีมผ่าตัด
              </p>
            )}
          </section>
        </Tabs.Panel>
        <Tabs.Panel
          value="anesthesia-team"
          className="min-h-40 focus-visible:outline-none"
        >
          <section
            aria-label="ข้อมูลวิสัญญีจาก HOSxP"
            className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-emerald-50/70 via-card to-card shadow-sm dark:border-emerald-300/10 dark:from-emerald-950/20"
          >
            <div className="flex items-center gap-3 border-b border-emerald-900/10 px-4 py-4 dark:border-emerald-300/10 sm:px-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Stethoscope aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="m-0 text-sm font-semibold tracking-tight">
                    ข้อมูลวิสัญญี
                  </h3>
                  <span className="rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    HOSxP
                  </span>
                </div>
                <p className="mb-0 mt-1 text-[11px] text-muted-foreground">
                  รหัสผ่าตัด{" "}
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {operationId}
                  </span>
                </p>
              </div>
            </div>
            <div className="space-y-3 p-3.5 sm:p-5">
              {anesthesia.isPending ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="h-24 animate-pulse rounded-xl bg-muted" />
                  <div className="h-24 animate-pulse rounded-xl bg-muted" />
                </div>
              ) : anesthesia.isError ? (
                <p
                  role="alert"
                  className="m-0 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  อ่านข้อมูลวิสัญญีจาก HOSxP ไม่สำเร็จ
                </p>
              ) : (
                <>
                  {anesthesia.data.assessment && (
                    <section className="rounded-xl border border-border/80 bg-background/75 p-3.5 dark:bg-background/40 sm:p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="m-0 text-xs font-semibold">
                          การประเมินก่อนดมยา
                        </h4>
                        <span className="rounded-lg bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                          Pre-anesthesia
                        </span>
                      </div>
                      <dl className="mb-0 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {[
                          [
                            "Physical status",
                            anesthesia.data.assessment.physical_status,
                          ],
                          ["ASA", anesthesia.data.assessment.asa_name],
                          ["ASA No.", anesthesia.data.assessment.asa_no],
                          ["Depth", anesthesia.data.assessment.asa_depth],
                          ["LV Grade", anesthesia.data.assessment.lv_grade],
                          [
                            "LV Grade ย่อย",
                            anesthesia.data.assessment.lv_grade_sub,
                          ],
                          [
                            "Technique 1",
                            anesthesia.data.assessment.technique1_name,
                          ],
                          [
                            "Technique 2",
                            anesthesia.data.assessment.technique2_name,
                          ],
                          [
                            "ชื่อวิสัญญีแพทย์",
                            anesthesia.data.assessment.anesthesiologist,
                          ],
                        ].map(([name, value]) => (
                          <div
                            key={String(name)}
                            className="min-w-0 rounded-lg bg-muted/40 px-2.5 py-2 dark:bg-muted/25"
                          >
                            <dt className="truncate text-[10px] font-medium text-muted-foreground">
                              {String(name)}
                            </dt>
                            <dd className="m-0 mt-1 break-words text-xs font-semibold leading-5 text-foreground">
                              {text(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  )}
                  {anesthesia.data.records.length > 0 && (
                    <section className="rounded-xl border border-border/80 bg-background/75 p-3.5 dark:bg-background/40 sm:p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="m-0 text-xs font-semibold">
                          รายการวิสัญญี
                        </h4>
                        <span className="rounded-lg bg-muted px-2 py-1 text-[10px] font-medium tabular-nums text-muted-foreground">
                          {anesthesia.data.records.length} รายการ
                        </span>
                      </div>
                      <div className="divide-y divide-border/70">
                        {anesthesia.data.records.map((record, index) => (
                          <article
                            key={String(record.anes_id ?? index)}
                            className="py-3 first:pt-0 last:pb-0"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                                  {index + 1}
                                </span>
                                <h5 className="m-0 truncate text-sm font-semibold">
                                  {text(record.anesthesia_name)}
                                </h5>
                              </div>
                              <span className="pl-8 text-[11px] tabular-nums text-muted-foreground sm:pl-0">
                                {anesthesiaDateTime(record.begin_date_time)} –{" "}
                                {anesthesiaDateTime(record.end_date_time)}
                              </span>
                            </div>
                            <dl className="mb-0 mt-2 grid gap-x-4 gap-y-2 pl-8 text-xs sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                              <div className="min-w-0">
                                <dt className="text-[10px] text-muted-foreground">
                                  หมายเหตุ
                                </dt>
                                <dd className="m-0 mt-0.5 break-words">
                                  {text(record.anes_note)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-[10px] text-muted-foreground">
                                  DF icode
                                </dt>
                                <dd className="m-0 mt-0.5 font-medium">
                                  {text(record.df_icode)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-[10px] text-muted-foreground">
                                  DF price
                                </dt>
                                <dd className="m-0 mt-0.5 font-medium tabular-nums">
                                  {text(record.df_price)}
                                </dd>
                              </div>
                            </dl>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}
                  {anesthesiaStaff.length > 0 && (
                    <section className="rounded-xl border border-border/80 bg-background/75 p-3.5 dark:bg-background/40 sm:p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="m-0 text-xs font-semibold">
                            บุคลากรวิสัญญี
                          </h4>
                          <p className="mb-0 mt-0.5 text-[10px] text-muted-foreground">
                            เจ้าหน้าที่ตามที่บันทึกใน HOSxP
                          </p>
                        </div>
                        <span className="rounded-lg bg-muted px-2 py-1 text-[10px] font-medium tabular-nums text-muted-foreground">
                          {anesthesiaStaff.length} คน
                        </span>
                      </div>
                      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
                        {anesthesiaStaff.map((member, index) => (
                          <li
                            key={String(
                              member.operation_anes_doctor_id ?? index,
                            )}
                            className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border/60 bg-muted/25 px-3 py-2"
                          >
                            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                              <UserRound
                                aria-hidden="true"
                                className="size-3.5"
                              />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-medium">
                              {text(member.doctor_name)}
                            </span>
                            <span
                              className={`max-w-[48%] shrink-0 truncate rounded-md border px-2.5 py-1 text-[10px] font-semibold ${anesthesiaStaffRoleStyle(member.position_name)}`}
                            >
                              {text(member.position_name)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {!anesthesia.data.assessment &&
                    !anesthesia.data.records.length &&
                    !anesthesia.data.staff.length && (
                      <p className="m-0 rounded-xl border border-dashed border-border bg-background/60 p-5 text-center text-sm text-muted-foreground">
                        ไม่พบข้อมูลวิสัญญีของรายการนี้ใน HOSxP
                      </p>
                    )}
                </>
              )}
            </div>
          </section>
        </Tabs.Panel>
      </Tabs.Root>
    </AppDialog>
  );
}
