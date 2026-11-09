"use client";

import { ThaiDatePicker } from "./thai-date-picker";

export function RegisterDateTimeField({ id, label, value, fallbackDate, onChange, onBlur, disabled, error, restoreSource }: {
  id: string; label: string; value: string; fallbackDate: string; onChange: (value: string) => void; onBlur: () => void;
  disabled: boolean; error?: string; restoreSource?: () => void;
}) {
  const [date = "", time = ""] = value.split("T");
  const changeTime = (next: string) => onChange(next || date ? `${date || fallbackDate}T${next}` : "");
  return <div className="min-w-0 rounded-xl border border-border/70 bg-background p-3.5">
    <div className="flex min-h-6 flex-wrap items-center justify-between gap-2"><label htmlFor={id} className="text-sm font-semibold">{label}</label>{restoreSource && <button type="button" disabled={disabled} onClick={restoreSource} className="text-xs font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50">คืนค่า HOSxP</button>}</div>
    <ThaiDatePicker compact value={date || fallbackDate} onChange={(next) => onChange(`${next}T${time}`)} disabled={disabled} label={`วันที่สำหรับ${label}`} />
    <div className="mt-2 flex items-center gap-2 rounded-xl border border-input bg-background px-3.5 focus-within:ring-2 focus-within:ring-ring">
      <input id={id} aria-label={`${label} (เวลา)`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : `${id}-hint`} value={time} disabled={disabled} onChange={(event) => changeTime(event.target.value.replace(/[^0-9:]/g, "").slice(0, 5))} onBlur={() => {
        const match = /^(\d{1,2}):?(\d{2})$/.exec(time);
        if (match) changeTime(`${match[1].padStart(2, "0")}:${match[2]}`);
        onBlur();
      }} type="text" inputMode="numeric" placeholder="09:30" autoComplete="off" className="h-12 min-w-0 flex-1 bg-transparent text-lg font-semibold tabular-nums tracking-wide outline-none placeholder:font-normal placeholder:text-muted-foreground/50 disabled:opacity-50" />
      <span className="shrink-0 text-xs text-muted-foreground">น.</span>
      {value && <button type="button" aria-label={`ล้าง${label}`} disabled={disabled} onClick={() => onChange("")} className="shrink-0 rounded-md px-1.5 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">ล้าง</button>}
    </div>
    <p id={`${id}-hint`} className="mb-0 mt-2 text-[11px] text-muted-foreground">เวลาไทย · 24 ชั่วโมง เช่น 09:30</p>
    {error && <p id={`${id}-error`} role="alert" className="mb-0 mt-2 text-xs text-destructive">{error}</p>}
  </div>;
}
