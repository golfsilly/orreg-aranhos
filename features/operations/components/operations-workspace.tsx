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
    <div role="group" aria-label="เลือกรูปแบบทะเบียน" className="mb-4 flex w-full gap-1 rounded-xl border border-border bg-muted/50 p-1 sm:mb-5 sm:w-fit">
      {views.map(({ id, title, description, icon: Icon }) => {
        const selected = view === id;
        return <button key={id} type="button" id={`operations-tab-${id}`} aria-pressed={selected} onClick={() => setView(id)} className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:min-w-[188px] sm:flex-none sm:justify-start sm:px-3.5 ${selected ? "bg-card text-foreground shadow-sm ring-1 ring-border/70" : "text-muted-foreground hover:text-foreground"}`}>
          <Icon aria-hidden="true" className={`size-4 shrink-0 ${selected ? "text-primary" : ""}`} />
          <span className="min-w-0"><span className="block truncate text-xs font-semibold sm:text-sm">{title}</span><span className="hidden text-[10px] text-muted-foreground sm:block">{description}</span></span>
        </button>;
      })}
    </div>
    <section id={panelId} aria-labelledby={`operations-tab-${view}`} className="min-w-0">
      {view === "monthly" ? <MonthlyRegisterView canSync={canSync} /> : <OperationsSearch canSync={canSync} />}
    </section>
  </div>;
}
