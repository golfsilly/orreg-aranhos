"use client";

import { Popover } from "@base-ui/react/popover";
import { Clock3, ChevronDown } from "lucide-react";
import { useState } from "react";

const hours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"));

export function ThaiTimePicker({ value, onChange, label, disabled = false }: { value: string; onChange: (value: string) => void; label: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [currentHour, currentMinute] = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)?.slice(1) ?? ["", ""];

  function choose(hour: string, minute: string) {
    onChange(`${hour || "00"}:${minute || "00"}`);
  }

  return <Popover.Root open={open} onOpenChange={setOpen}>
    <Popover.Trigger disabled={disabled} aria-label={`${label}${value ? ` ${value} นาฬิกา` : " เลือกเวลา"}`} className="mt-2 flex min-h-12 w-full min-w-0 items-center gap-1.5 rounded-xl border border-input bg-background px-2.5 text-left text-sm shadow-sm transition hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-55">
      <Clock3 aria-hidden="true" className="size-4 shrink-0 text-primary" />
      <span className={`min-w-0 flex-1 whitespace-nowrap text-center text-xs font-semibold tabular-nums ${value ? "text-foreground" : "text-muted-foreground"}`}>{value || "--:--"}</span>
      <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Positioner side="bottom" align="end" sideOffset={6} className="z-[80] outline-none">
        <Popover.Popup className="w-[228px] rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-2xl shadow-black/15 outline-none dark:shadow-black/40">
          <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
            <p className="m-0 text-xs font-semibold">เลือกเวลา</p>
            <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold tabular-nums text-primary">{value || "--:--"}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[{ title: "ชั่วโมง", values: hours, selected: currentHour, part: "hour" as const }, { title: "นาที", values: minutes, selected: currentMinute, part: "minute" as const }].map((column) => <div key={column.part}>
              <p className="mb-1 text-center text-[10px] font-medium text-muted-foreground">{column.title}</p>
              <div className="h-48 space-y-1 overflow-y-auto rounded-xl bg-muted/35 p-1" role="listbox" aria-label={column.title}>
                {column.values.map((item) => <button key={item} type="button" role="option" aria-selected={column.selected === item} onClick={() => { choose(column.part === "hour" ? item : currentHour, column.part === "minute" ? item : currentMinute); if (column.part === "minute") setOpen(false); }} className={`min-h-9 w-full rounded-lg text-sm tabular-nums transition ${column.selected === item ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-primary/10 hover:text-primary"}`}>{item}</button>)}
              </div>
            </div>)}
          </div>
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  </Popover.Root>;
}
