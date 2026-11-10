"use client";

import { useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowLeft, ArrowRight, CalendarDays, Clock3, RotateCcw, TriangleAlert } from "lucide-react";
import { OperationRegisterDialog } from "../shared/operation-register-dialog";
import { OperatingRoomCalendarSkeleton } from "./operating-room-calendar-skeleton";
import { ThaiDatePicker } from "../shared/thai-date-picker";
import {
  bangkokDateTime,
  calendarMonths,
  monthKey,
  occupancyOnDate,
  occupancyInterval,
  operationOccursOnDate,
  operationCalendarDate,
  overlappingOperationIds,
  shiftDate,
  thaiDate,
  timeLabel,
  visibleCalendarDays,
  type CalendarOperation,
  type CalendarView,
  type OperatingRoom,
} from "../../lib/calendar";

type CalendarResponse = { operations: CalendarOperation[]; rooms: OperatingRoom[] };
const todayBangkok = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
};
const rowId = (operation: CalendarOperation) => String(operation.operation_id);
const rowText = (value: unknown, fallback = "—") => typeof value === "string" || typeof value === "number" ? String(value) : fallback;
const fetchMonth = async (month: string, signal?: AbortSignal): Promise<CalendarResponse> => {
  const response = await fetch(`/api/hosxp/operations?month=${encodeURIComponent(month)}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(response.status === 503 ? "เชื่อมต่อ HOSxP ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" : "ไม่สามารถโหลดตารางห้องผ่าตัดได้");
  const payload = await response.json() as Partial<CalendarResponse>;
  if (!Array.isArray(payload.operations) || !Array.isArray(payload.rooms)) throw new Error("รูปแบบข้อมูลปฏิทินไม่ถูกต้อง");
  return { operations: payload.operations, rooms: payload.rooms };
};

function RoomOperationCard({ operation, overlap, compact, timeRange, onClick }: { operation: CalendarOperation; overlap: boolean; compact?: boolean; timeRange?: string; onClick: () => void }) {
  const emergency = typeof operation.emergency_name === "string" && operation.emergency_name.toLocaleLowerCase("en").includes("emergency");
  const interval = occupancyInterval(operation);
  const registered = typeof operation.registerNumber === "string" && !operation.needsDateSync;
  return <button type="button" onClick={onClick} className={`group relative w-full min-w-0 overflow-hidden rounded-xl border p-2.5 pl-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring before:absolute before:inset-y-0 before:left-0 before:w-1 ${overlap ? "border-rose-500/40 bg-rose-500/[0.06] before:bg-rose-500 ring-1 ring-rose-500/15" : emergency ? "border-amber-500/30 bg-amber-500/[0.055] before:bg-amber-500/70 hover:border-amber-500/50" : "border-emerald-900/10 bg-gradient-to-br from-emerald-50/90 to-white dark:border-emerald-100/10 dark:from-emerald-950/35 dark:to-card before:bg-primary/70 hover:border-primary/35"} ${compact ? "p-2 pl-3" : ""}`}>
    <span className="flex min-w-0 items-start justify-between gap-1.5">
      <span className="min-w-0 truncate text-xs font-bold text-primary">{registered ? rowText(operation.registerNumber) : "รอซิงก์"}</span>
      {overlap && <TriangleAlert aria-label="เวลาใช้ห้องผ่าตัดทับซ้อน" className="size-3.5 shrink-0 text-rose-600 dark:text-rose-400" />}
    </span>
      <span className="mt-1 block truncate text-xs font-semibold text-foreground group-hover:text-primary">{rowText(operation.ptname, "ไม่ระบุชื่อ")}</span>
    <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-muted-foreground">
      {interval ? <><Clock3 aria-hidden="true" className="size-3" />{timeRange ?? `${timeLabel(operation.roomEnteredAt)}–${timeLabel(operation.roomExitedAt)}`}</> : <span className="rounded-full bg-muted px-1.5 py-0.5">ไม่ระบุเวลา</span>}
      <span className={`rounded-full px-1.5 py-0.5 font-semibold ${emergency ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>{emergency ? "ฉุกเฉิน" : "นัดหมาย"}</span>
    </span>
    {overlap && <span className="mt-1.5 block text-[10px] font-semibold text-rose-700 dark:text-rose-300">เวลาห้องทับซ้อน</span>}
  </button>;
}

function DayTimeline({ date, rooms, operations, overlapIds, onOpen, onPickRoom }: {
  date: string; rooms: OperatingRoom[]; operations: CalendarOperation[]; overlapIds: Set<string>; onOpen: (id: string) => void; onPickRoom: (id: string) => void;
}) {
  const hourRows = Array.from({ length: 24 }, (_, hour) => hour);
  const unscheduledOperations = operations.filter((operation) => operationCalendarDate(operation) === date && !occupancyInterval(operation));
  const roomFor = (operation: CalendarOperation) => String(operation.sourceRoomId ?? "UNSPECIFIED");
  const roomOperations = (room: OperatingRoom) => operations.filter((operation) => roomFor(operation) === room.id && operationOccursOnDate(operation, date) && occupancyInterval(operation));
  const roomUnscheduled = (roomId: string) => operations.filter((operation) => roomFor(operation) === roomId && operationCalendarDate(operation) === date && !occupancyInterval(operation));
  return <>
    <div data-testid="calendar-day-mobile" className="md:hidden">
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" aria-label="เลือกห้องผ่าตัด">
        <button type="button" aria-pressed={rooms.length > 1} onClick={() => onPickRoom("ALL")} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${rooms.length > 1 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}>ทุกห้อง</button>
        {rooms.map((room) => <button key={room.id} type="button" aria-pressed={rooms.length === 1 && rooms[0]?.id === room.id} onClick={() => onPickRoom(room.id)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${rooms.length === 1 && rooms[0]?.id === room.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}>{room.name}<span className="ml-1.5 opacity-70">{operations.filter((operation) => roomFor(operation) === room.id && operationCalendarDate(operation) === date).length}</span></button>)}
      </div>
      {rooms.map((room) => {
        const scheduled = roomOperations(room).sort((a, b) => (bangkokDateTime(a.roomEnteredAt)?.timestamp ?? 0) - (bangkokDateTime(b.roomEnteredAt)?.timestamp ?? 0));
        const unscheduled = roomUnscheduled(room.id);
        return <section key={room.id} className="mb-3 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <header className="flex items-center justify-between border-b border-border/70 bg-gradient-to-r from-primary/[0.055] via-muted/20 to-transparent px-4 py-3"><span className="flex min-w-0 items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Activity aria-hidden="true" className="size-4" /></span><span className="min-w-0"><h3 className="m-0 truncate text-sm font-semibold tracking-tight">{room.name}</h3><span className="mt-0.5 block text-[10px] text-muted-foreground">ห้องผ่าตัด</span></span></span><span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{scheduled.length} คิว</span></header>
          <div className="space-y-2 p-3">{scheduled.length ? scheduled.map((operation) => { const slot = occupancyOnDate(operation, date); const label = slot?.continuesFromPreviousDay ? "ต่อเนื่อง" : timeLabel(operation.roomEnteredAt); const intervalLabel = slot?.continuesFromPreviousDay ? `ต่อเนื่องถึง ${timeLabel(operation.roomExitedAt)}` : undefined; return <div key={rowId(operation)} className="grid grid-cols-[52px_minmax(0,1fr)] gap-2"><span className="pt-2 text-[11px] font-semibold tabular-nums text-muted-foreground">{label}</span><RoomOperationCard operation={operation} overlap={overlapIds.has(rowId(operation))} timeRange={intervalLabel} onClick={() => onOpen(rowId(operation))} /></div>; }) : <p className="m-0 rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">ไม่มีคิวตามเวลาที่บันทึก</p>}
            {unscheduled.length > 0 && <div className="mt-3 border-t border-dashed border-border pt-3"><p className="mb-2 mt-0 text-[11px] font-semibold text-muted-foreground">คิวไม่ระบุเวลา · {unscheduled.length}</p><div className="space-y-2">{unscheduled.map((operation) => <RoomOperationCard key={rowId(operation)} operation={operation} overlap={false} onClick={() => onOpen(rowId(operation))} />)}</div></div>}
          </div>
        </section>;
      })}
    </div>
    <div data-testid="calendar-day-desktop" className="hidden overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm md:block">
      <div className="min-w-max">
        <div className="grid border-b border-border bg-gradient-to-r from-primary/[0.05] via-muted/35 to-muted/20" style={{ gridTemplateColumns: `56px repeat(${rooms.length}, minmax(220px, 1fr))` }}>
          <div className="sticky left-0 z-10 border-r border-border/70 bg-muted/70 p-3 text-[10px] font-semibold text-muted-foreground">เวลา</div>
          {rooms.map((room) => { const count = operations.filter((operation) => roomFor(operation) === room.id && operationCalendarDate(operation) === date).length; return <div key={room.id} className="border-l border-border/80 px-3 py-3"><p className="m-0 truncate text-xs font-semibold tracking-tight">{room.name}</p><p className="mb-0 mt-1 text-[10px] text-muted-foreground">{count ? `${count} รายการ` : "ห้องว่าง"}</p></div>; })}
        </div>
        <div className="flex">
          <div className="sticky left-0 z-[2] w-14 shrink-0 bg-background/90 backdrop-blur-sm">{hourRows.map((hour) => <div key={hour} className={`h-16 border-b border-border/70 pr-2 pt-1 text-right text-[10px] tabular-nums ${hour >= 7 && hour < 19 ? "font-medium text-muted-foreground" : "text-muted-foreground/60"}`}>{String(hour).padStart(2, "0")}:00</div>)}</div>
          {rooms.map((room) => <div key={room.id} className="relative min-h-[1536px] min-w-[220px] flex-1 border-l border-border/80" style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 63px, var(--border) 64px)", backgroundSize: "100% 64px" }}>
            {roomOperations(room).map((operation) => {
              const slot = occupancyOnDate(operation, date);
              if (!slot || slot.endMinute <= slot.startMinute) return null;
              const height = Math.max(40, ((slot.endMinute - slot.startMinute) / 60) * 64);
              const timeRange = slot.continuesFromPreviousDay ? `ต่อเนื่องถึง ${timeLabel(operation.roomExitedAt)}` : undefined;
              return <div key={rowId(operation)} className="absolute left-1.5 right-1.5 z-[1]" style={{ top: `${(slot.startMinute / 60) * 64}px`, height: `${height}px` }}><RoomOperationCard operation={operation} overlap={overlapIds.has(rowId(operation))} compact timeRange={timeRange} onClick={() => onOpen(rowId(operation))} /></div>;
            })}
          </div>)}
        </div>
      </div>
    </div>
    {unscheduledOperations.length > 0 && <section aria-label="คิวไม่ระบุเวลา" className="mt-4 hidden rounded-2xl border border-dashed border-border bg-card p-4 md:block"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="m-0 text-sm font-semibold">คิวไม่ระบุเวลา</h3><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{unscheduledOperations.length} รายการ</span></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{unscheduledOperations.map((operation) => <RoomOperationCard key={rowId(operation)} operation={operation} overlap={false} onClick={() => onOpen(rowId(operation))} />)}</div></section>}
  </>;
}

function PeriodOverview({ view, days, operations, overlapIds, onOpen, onChooseDate, selectedDate }: {
  view: "week" | "month"; days: string[]; operations: CalendarOperation[]; overlapIds: Set<string>; onOpen: (id: string) => void; onChooseDate: (date: string) => void; selectedDate: string;
}) {
  const weekdayNames = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
  const allRooms = new Map(operations.map((operation) => [String(operation.sourceRoomId ?? "UNSPECIFIED"), rowText(operation.room_name, "ไม่ระบุห้อง")]));
  const renderDay = (day: string, compact = false) => {
    const items = operations.filter((operation) => operationOccursOnDate(operation, day));
    return <article key={day} className={`min-w-0 overflow-hidden rounded-xl border bg-card ${selectedDate === day ? "border-primary/50 ring-1 ring-primary/20" : "border-border"}`}>
      <button type="button" onClick={() => onChooseDate(day)} className="flex w-full items-center justify-between gap-2 border-b border-border bg-muted/25 px-3 py-2.5 text-left hover:bg-primary/5"><span className="text-xs font-semibold text-foreground">{thaiDate(day, { weekday: "short", day: "numeric", month: "short" })}</span><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{items.length}</span></button>
      <div className={`space-y-1.5 p-2 ${compact ? "min-h-16" : "min-h-36"}`}>{items.slice(0, compact ? 3 : 12).map((operation) => { const slot = occupancyOnDate(operation, day); const time = slot?.continuesFromPreviousDay ? `ต่อเนื่องถึง ${timeLabel(operation.roomExitedAt)}` : timeLabel(operation.roomEnteredAt) === "—" ? "--:--" : timeLabel(operation.roomEnteredAt); return <button key={rowId(operation)} type="button" onClick={() => onOpen(rowId(operation))} className={`block w-full truncate rounded-lg border px-2 py-1.5 text-left text-[10px] transition hover:border-primary/40 ${overlapIds.has(rowId(operation)) ? "border-rose-500/50 bg-rose-500/10 text-rose-800 dark:text-rose-300" : "border-border/70 bg-background text-foreground"}`}><span className="mr-1.5 font-semibold text-primary">{time}</span><span className="mr-1 text-muted-foreground">{allRooms.get(String(operation.sourceRoomId ?? "UNSPECIFIED")) ?? "ไม่ระบุห้อง"}</span>{rowText(operation.registerNumber, "รอซิงก์")} · {rowText(operation.ptname, "ไม่ระบุชื่อ")}</button>; })}{items.length > (compact ? 3 : 12) && <p className="m-0 px-1 text-[10px] text-muted-foreground">อีก {items.length - (compact ? 3 : 12)} รายการ</p>}{!items.length && <p className="m-0 py-3 text-center text-[10px] text-muted-foreground">ไม่มีรายการ</p>}</div>
    </article>;
  };
  if (view === "week") return <div data-testid="calendar-week" className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">{days.map((day) => renderDay(day))}</div>;
  const monthFirst = new Date(`${monthKey(days[0] ?? selectedDate)}-01T12:00:00.000Z`);
  const leading = (monthFirst.getUTCDay() + 6) % 7;
  return <div data-testid="calendar-month" className="overflow-hidden rounded-2xl border border-border bg-card">
    <div className="grid grid-cols-7 border-b border-border bg-muted/35">{weekdayNames.map((weekday) => <div key={weekday} className="px-1 py-2 text-center text-[10px] font-bold text-muted-foreground sm:px-2 sm:py-3 sm:text-xs">{weekday}</div>)}</div>
    <div className="grid grid-cols-7 gap-px bg-border">{Array.from({ length: leading }, (_, index) => <div key={`blank-${index}`} className="min-h-24 bg-muted/15 sm:min-h-32" />)}{days.map((day) => renderDay(day, true))}</div>
  </div>;
}

export function OperatingRoomCalendarPage({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayBangkok);
  const [view, setView] = useState<CalendarView>("day");
  const [department, setDepartment] = useState("ALL");
  const [roomFilter, setRoomFilter] = useState("ALL");
  const [selectedOperationId, setSelectedOperationId] = useState("");
  const months = calendarMonths(date, view);
  const monthQueries = useQueries({ queries: months.map((month) => ({ queryKey: ["operations-calendar-month", month], queryFn: ({ signal }: { signal: AbortSignal }) => fetchMonth(month, signal), staleTime: 30_000 })) });
  const loading = monthQueries.some((query) => query.isPending);
  const failedQuery = monthQueries.find((query) => query.isError);
  const operations = [...new Map(monthQueries.flatMap((query) => query.data?.operations ?? []).map((operation) => [rowId(operation), operation])).values()];
  const roomMap = new Map(monthQueries.flatMap((query) => query.data?.rooms ?? []).map((room) => [room.id, room]));
  for (const operation of operations) {
    const id = typeof operation.sourceRoomId === "string" ? operation.sourceRoomId : "UNSPECIFIED";
    if (!roomMap.has(id)) roomMap.set(id, { id, name: rowText(operation.room_name, "ไม่ระบุห้อง") });
  }
  const rooms = [...roomMap.values()].sort((a, b) => a.name.localeCompare(b.name, "th"));
  const departments = [...new Map(operations.map((operation) => [String(operation.sourceDepartmentId ?? "UNSPECIFIED"), rowText(operation.departmentName, "ไม่ระบุแผนก")])).entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "th"));
  const filteredOperations = operations.filter((operation) => (department === "ALL" || String(operation.sourceDepartmentId ?? "UNSPECIFIED") === department) && (roomFilter === "ALL" || String(operation.sourceRoomId ?? "UNSPECIFIED") === roomFilter));
  const days = visibleCalendarDays(date, view);
  const viewOperations = filteredOperations.filter((operation) => days.some((day) => operationOccursOnDate(operation, day)));
  const overlapIds = overlappingOperationIds(viewOperations);
  const selectedOperation = viewOperations.find((operation) => rowId(operation) === selectedOperationId);
  const roomNamesForView = roomFilter === "ALL" ? rooms : rooms.filter((room) => room.id === roomFilter);
  const scheduledCount = viewOperations.filter((operation) => occupancyInterval(operation)).length;
  const unscheduledCount = viewOperations.length - scheduledCount;
  const displayTitle = view === "day" ? thaiDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : view === "week" ? `${thaiDate(days[0]!, { day: "numeric", month: "short" })} – ${thaiDate(days[6]!, { day: "numeric", month: "short", year: "numeric" })}` : thaiDate(`${monthKey(date)}-15`, { month: "long", year: "numeric" });
  const moveDate = (direction: -1 | 1) => setDate((current) => view === "day" ? shiftDate(current, direction) : view === "week" ? shiftDate(current, direction * 7) : shiftDate(`${monthKey(current)}-15`, direction * 28).slice(0, 7) + "-15");
  const setMonthDirection = (direction: -1 | 1) => {
    const current = new Date(`${date}T12:00:00.000Z`);
    current.setUTCDate(1);
    current.setUTCMonth(current.getUTCMonth() + direction);
    setDate(`${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}-01`);
  };
  const navigate = (direction: -1 | 1) => view === "month" ? setMonthDirection(direction) : moveDate(direction);
  const selectedOperationIdValue = (id: string) => setSelectedOperationId(id);

  return <div className="min-w-0 space-y-5">
    <header className="relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-emerald-50/80 via-background to-background px-5 py-5 shadow-sm dark:border-emerald-100/10 dark:from-emerald-950/25 sm:px-7 sm:py-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-primary/[0.06] blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5"><span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-primary/10 bg-white/80 text-primary shadow-sm dark:bg-primary/10 sm:size-14"><CalendarDays aria-hidden="true" className="size-6 sm:size-7" /></span><div className="min-w-0"><p className="mb-1 text-[10px] font-bold tracking-[0.2em] text-primary">SURGERY REGISTER <span className="text-muted-foreground/60">/</span> ROOM SCHEDULE</p><h1 className="m-0 text-2xl font-semibold tracking-tight sm:text-3xl">ปฏิทินห้องผ่าตัด</h1><p className="mb-0 mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">ตารางใช้ห้องจาก HOSxP พร้อมเวลาและข้อมูลทะเบียน</p></div></div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-white/75 px-3 py-2 text-[11px] font-semibold text-muted-foreground shadow-sm dark:bg-card/70"><span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px] shadow-emerald-500/15" />Asia/Bangkok <span className="text-border">·</span> เวลาไทย</span>
      </div>
    </header>

    <section aria-label="ตัวกรองปฏิทิน" className="rounded-3xl border border-border/80 bg-card p-3 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 sm:min-w-64"><ThaiDatePicker value={date} onChange={setDate} label="วันที่ในปฏิทิน" /></div>
          <div className="flex h-12 w-full shrink-0 items-center justify-between gap-1 rounded-2xl border border-border/80 bg-muted/30 p-1 sm:w-auto sm:justify-start"><button type="button" aria-label="ช่วงเวลาก่อนหน้า" onClick={() => navigate(-1)} className="grid size-10 shrink-0 place-items-center rounded-xl text-foreground transition hover:bg-background"><ArrowLeft aria-hidden="true" className="size-4" /></button><button type="button" onClick={() => setDate(todayBangkok())} className="h-10 flex-1 rounded-xl px-3 text-xs font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary hover:shadow-sm focus-visible:bg-primary/10 focus-visible:text-primary sm:flex-none">วันนี้</button><button type="button" aria-label="ช่วงเวลาถัดไป" onClick={() => navigate(1)} className="grid size-10 shrink-0 place-items-center rounded-xl text-foreground transition hover:bg-background"><ArrowRight aria-hidden="true" className="size-4" /></button></div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_auto]">
          <label className="grid gap-1 text-[10px] font-semibold text-muted-foreground">แผนก<select aria-label="กรองแผนก" value={department} onChange={(event) => setDepartment(event.target.value)} className="h-10 min-w-0 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="ALL">ทุกแผนก</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1 text-[10px] font-semibold text-muted-foreground">ห้องผ่าตัด<select aria-label="กรองห้องผ่าตัด" value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)} className="h-10 min-w-0 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="ALL">ทุกห้อง</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
          <div role="group" aria-label="เลือกมุมมองปฏิทิน" className="col-span-2 flex h-12 items-center rounded-2xl border border-border/80 bg-muted/30 p-1 sm:col-span-1">{([{ id: "day", label: "วัน" }, { id: "week", label: "สัปดาห์" }, { id: "month", label: "เดือน" }] as const).map((option) => <button key={option.id} type="button" aria-pressed={view === option.id} onClick={() => setView(option.id)} className={`h-10 flex-1 rounded-xl px-2.5 text-xs font-semibold transition ${view === option.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{option.label}</button>)}</div>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="m-0 min-w-0 text-base font-semibold tracking-tight sm:text-lg">{displayTitle}</h2>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <div className="flex min-w-32 items-center gap-2.5 rounded-2xl border border-primary/10 bg-primary/[0.045] px-3 py-2"><span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary"><Clock3 aria-hidden="true" className="size-4" /></span><span><span className="block text-[10px] text-muted-foreground">มีเวลา</span><span className="block text-sm font-bold tabular-nums text-foreground">{scheduledCount} <span className="text-[10px] font-medium text-muted-foreground">คิว</span></span></span></div>
          <div className="flex min-w-32 items-center gap-2.5 rounded-2xl border border-border/70 bg-muted/25 px-3 py-2"><span className="grid size-8 place-items-center rounded-xl bg-muted text-muted-foreground"><CalendarDays aria-hidden="true" className="size-4" /></span><span><span className="block text-[10px] text-muted-foreground">ไม่ระบุเวลา</span><span className="block text-sm font-bold tabular-nums text-foreground">{unscheduledCount} <span className="text-[10px] font-medium text-muted-foreground">คิว</span></span></span></div>
          {overlapIds.size > 0 && <div className="col-span-2 flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/[0.055] px-3 py-2 sm:col-span-1"><span className="grid size-8 place-items-center rounded-xl bg-rose-500/10 text-rose-600"><TriangleAlert aria-hidden="true" className="size-4" /></span><span><span className="block text-[10px] text-rose-700 dark:text-rose-300">เวลาทับซ้อน</span><span className="block text-sm font-bold tabular-nums text-rose-800 dark:text-rose-200">{overlapIds.size} <span className="text-[10px] font-medium">คิว</span></span></span></div>}
        </div>
      </div>
    </section>

    {loading ? <OperatingRoomCalendarSkeleton /> : failedQuery ? <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/5 p-5 text-sm text-destructive"><p className="m-0 font-semibold">{failedQuery.error instanceof Error ? failedQuery.error.message : "โหลดข้อมูลปฏิทินไม่สำเร็จ"}</p><button type="button" onClick={() => void Promise.all(monthQueries.map((query) => query.refetch()))} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-destructive/20 bg-background px-3 py-2 text-xs font-semibold"><RotateCcw aria-hidden="true" className="size-3.5" />ลองอีกครั้ง</button></div> : rooms.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-14 text-center"><CalendarDays aria-hidden="true" className="mx-auto size-9 text-muted-foreground/50" /><p className="mb-0 mt-3 text-sm font-semibold">ไม่พบห้องผ่าตัดใน HOSxP</p><p className="mb-0 mt-1 text-xs text-muted-foreground">ตรวจสอบข้อมูลห้องผ่าตัดใน HOSxP แล้วลองโหลดใหม่</p></div> : view === "day" ? <DayTimeline date={date} rooms={roomNamesForView} operations={viewOperations} overlapIds={overlapIds} onOpen={selectedOperationIdValue} onPickRoom={setRoomFilter} /> : <PeriodOverview view={view} days={days} operations={viewOperations} overlapIds={overlapIds} onOpen={selectedOperationIdValue} onChooseDate={(day) => { setDate(day); setView("day"); }} selectedDate={date} />}

    {selectedOperation && <OperationRegisterDialog key={selectedOperationId} row={selectedOperation} canEdit={canEdit} onClose={() => setSelectedOperationId("")} onChanged={() => { void queryClient.invalidateQueries({ queryKey: ["operations-calendar-month"] }); void queryClient.invalidateQueries({ queryKey: ["operations-month"] }); void queryClient.invalidateQueries({ queryKey: ["operations"] }); }} />}
    <p className="m-0 text-[11px] leading-5 text-muted-foreground">ข้อมูลผู้ป่วยและเวลาผ่าตัดอ่านจาก HOSxP แบบ read-only · การแก้ไขเวลาใน OR-Reg ไม่เปลี่ยนข้อมูลต้นทาง</p>
  </div>;
}
