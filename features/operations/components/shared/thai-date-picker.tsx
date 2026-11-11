"use client";

import { Popover } from "@base-ui/react/popover";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const weekdayLabels = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const monthLabels = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat("th-TH", { month: "long" }).format(new Date(2020, month, 1)));
const longDateFormat = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortDateFormat = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { day: "numeric", month: "short", year: "numeric" });

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatThaiDate(date: Date) {
  return longDateFormat
    .formatToParts(date)
    .map((part) => (part.type === "year" ? `พ.ศ. ${part.value}` : part.value))
    .join("");
}

export function formatThaiDateValue(value: string) {
  const date = parseDate(value);
  return date ? formatThaiDate(date) : value;
}

export function ThaiDatePicker({
  value,
  onChange,
  disabled = false,
  label,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDate(value) ?? new Date());
  const selectedDate = parseDate(value);
  const today = new Date();
  const currentYear = today.getFullYear();
  const firstYear = Math.min(2565 - 543, visibleMonth.getFullYear());
  const lastYear = Math.max(currentYear + 3, visibleMonth.getFullYear());
  const yearOptions = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);
  const todayIso = toIsoDate(today);
  const startWeekday = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const weekCount = Math.ceil((startWeekday + daysInMonth) / 7);
  const monthDays = Array.from({ length: weekCount * 7 }, (_, index) => {
    const day = index - startWeekday + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  function shiftMonth(amount: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1, 12));
  }

  function selectDate(date: Date) {
    onChange(toIsoDate(date));
    setVisibleMonth(date);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        disabled={disabled}
        aria-label={label ?? (selectedDate ? `วันที่ผ่าตัด ${formatThaiDate(selectedDate)} กดเพื่อเลือกวันใหม่` : "เลือกวันที่ผ่าตัด")}
        className={`mt-2 flex w-full items-center border border-input bg-background text-left shadow-sm transition hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-55 ${compact ? "min-h-12 gap-2 rounded-xl px-3 py-2" : "min-h-[66px] gap-3 rounded-2xl px-4 py-3"}`}
      >
        <span className={`grid shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ${compact ? "size-8" : "size-10"}`}><CalendarDays className={compact ? "size-4" : "size-5"} /></span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-semibold ${selectedDate ? "text-foreground" : "text-muted-foreground"}`}>
            {selectedDate ? compact ? shortDateFormat.format(selectedDate) : formatThaiDate(selectedDate) : "เลือกวันที่ผ่าตัด"}
          </span>
          {!compact && <span className="mt-1 block text-[11px] text-muted-foreground">ปฏิทินไทย · ปี พ.ศ.</span>}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8} className="z-[70] outline-none">
          <Popover.Popup className="w-[min(360px,calc(100vw-2rem))] rounded-[22px] border border-border bg-popover p-4 text-popover-foreground shadow-2xl shadow-black/15 outline-none data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95 dark:shadow-black/40">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold tracking-[0.16em] text-primary">เลือกวันผ่าตัด</p>
                <div className="mt-1 grid grid-cols-[minmax(0,1fr)_minmax(88px,auto)] gap-1.5">
                  <select aria-label="เลือกเดือน" value={visibleMonth.getMonth()} onChange={(event) => setVisibleMonth((current) => new Date(current.getFullYear(), Number(event.target.value), 1, 12))} className="h-9 min-w-0 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">{monthLabels.map((month, index) => <option key={month} value={index}>{month}</option>)}</select>
                  <select aria-label="เลือกปี พ.ศ." value={visibleMonth.getFullYear()} onChange={(event) => setVisibleMonth((current) => new Date(Number(event.target.value), current.getMonth(), 1, 12))} className="h-9 min-w-0 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">{yearOptions.map((year) => <option key={year} value={year}>{year + 543}</option>)}</select>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => shiftMonth(-1)} className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><ChevronLeft className="size-4" /></button>
                <button type="button" aria-label="เดือนถัดไป" onClick={() => shiftMonth(1)} className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><ChevronRight className="size-4" /></button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center" role="group" aria-label="ปฏิทิน">
              {weekdayLabels.map((day, index) => <span key={`${day}-${index}`} aria-hidden="true" className="grid h-8 place-items-center text-[11px] font-semibold text-muted-foreground">{day}</span>)}
              {monthDays.map((day, index) => {
                if (day === null) return <span key={`empty-${index}`} aria-hidden="true" className="h-10" />;
                const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day, 12);
                const iso = toIsoDate(date);
                const selected = iso === value;
                const isToday = iso === todayIso;
                return <button key={iso} type="button" aria-label={formatThaiDate(date)} aria-pressed={selected} onClick={() => selectDate(date)} className={`relative mx-auto grid size-10 place-items-center rounded-xl text-sm transition focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? "bg-primary font-bold text-primary-foreground shadow-md" : "text-foreground hover:bg-primary/10 hover:text-primary"} ${isToday && !selected ? "font-bold text-primary after:absolute after:bottom-1.5 after:size-1 after:rounded-full after:bg-primary" : ""}`}>{day}</button>;
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <p className="max-w-[220px] truncate text-xs text-muted-foreground">{selectedDate ? formatThaiDate(selectedDate) : "ยังไม่ได้เลือกวันที่"}</p>
              <button type="button" onClick={() => selectDate(today)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">วันนี้</button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
