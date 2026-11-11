"use client";

import { useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import { OperationsSearch } from "./daily/operations-search";
import { MonthlyRegisterView } from "./monthly/monthly-register-view";

type View = "monthly" | "daily";
const views = [
  { id: "monthly" as const, title: "ทะเบียนรายเดือน", description: "แยกตามแผนก", icon: CalendarDays },
  { id: "daily" as const, title: "ค้นหารายวัน", description: "ค้นหารายการ HOSxP", icon: Search },
];

export function OperationsWorkspace({ canSync }: { canSync: boolean }) {
  const [view, setView] = useState<View>("monthly");
  const panelId = `operations-panel-${view}`;

  return <div className="min-w-0">
    <div role="group" aria-label="เลือกรูปแบบทะเบียน" className="mb-4 grid w-full grid-cols-2 gap-2 rounded-2xl border border-border/80 bg-card p-2 shadow-sm sm:mb-5 sm:w-fit sm:min-w-[420px]">
      {views.map(({ id, title, description, icon: Icon }) => {
        const selected = view === id;
        return <button key={id} type="button" id={`operations-tab-${id}`} aria-pressed={selected} onClick={() => setView(id)} className={`flex min-h-[62px] min-w-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:min-w-[198px] sm:px-3.5 ${selected ? "border-primary/25 bg-primary/[0.07] text-foreground shadow-sm" : "border-transparent bg-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/55 hover:text-foreground"}`}>
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${selected ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"}`}><Icon aria-hidden="true" className="size-4" /></span>
          <span className="min-w-0"><span className="block truncate text-xs font-semibold sm:text-sm">{title}</span><span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{description}</span></span>
        </button>;
      })}
    </div>
    <section id={panelId} aria-labelledby={`operations-tab-${view}`} className="min-w-0">
      {view === "monthly" ? <MonthlyRegisterView canSync={canSync} /> : <OperationsSearch canSync={canSync} />}
    </section>
  </div>;
}
