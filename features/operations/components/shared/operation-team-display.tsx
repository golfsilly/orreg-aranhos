"use client";

import { Tabs } from "@base-ui/react/tabs";
import { LayoutList, UsersRound } from "lucide-react";
import { groupOperationTeam } from "../../lib/operation-team-groups";
import { OperationTeamAssignments } from "./operation-team-assignments";

const tabClass = "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[active]:bg-card data-[active]:text-primary data-[active]:shadow-sm data-[active]:ring-1 data-[active]:ring-border/70 sm:flex-none sm:px-4 sm:text-sm";

export function OperationTeamDisplay({ team }: { team: Record<string, unknown>[] }) {
  const { groups, ungrouped } = groupOperationTeam(team);
  return <Tabs.Root defaultValue="all" className="min-w-0">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Tabs.List activateOnFocus aria-label="รูปแบบแสดงทีมผ่าตัด" className="inline-flex min-w-0 gap-1 rounded-2xl border border-border bg-muted/50 p-1 sm:w-fit">
        <Tabs.Tab value="all" className={tabClass}><LayoutList aria-hidden="true" className="size-4 shrink-0" />แบบรวม</Tabs.Tab>
        <Tabs.Tab value="groups" className={tabClass}><UsersRound aria-hidden="true" className="size-4 shrink-0" />แบ่ง 5 กลุ่ม</Tabs.Tab>
      </Tabs.List>
      <p className="m-0 text-xs text-muted-foreground">{team.length.toLocaleString("th-TH")} รายการปฏิบัติงาน</p>
    </div>
    <Tabs.Panel value="all" className="min-w-0 outline-none">
      {team.length ? <OperationTeamAssignments team={team} /> : <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">ไม่พบข้อมูลทีมผ่าตัด</p>}
    </Tabs.Panel>
    <Tabs.Panel value="groups" className="mt-4 min-w-0 space-y-4 outline-none">
      {groups.map((group) => <section key={group.id} aria-label={`กลุ่ม ${group.id} ${group.name}`} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
        <header className="flex items-start gap-3 border-b border-border/70 bg-primary/[0.045] px-4 py-3.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{group.id}</span>
          <div className="min-w-0 flex-1"><p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">กลุ่มที่ {group.id}</p><h4 className="m-0 mt-0.5 text-sm font-semibold text-foreground">{group.name}</h4>{group.description && <p className="mb-0 mt-1 text-xs leading-5 text-muted-foreground">{group.description}</p>}</div>
          <span className="shrink-0 rounded-full border border-primary/10 bg-background px-2.5 py-1 text-xs font-semibold tabular-nums text-primary">{group.members.length} รายการ</span>
        </header>
        <div className="min-w-0 px-3 pb-3 sm:px-4 sm:pb-4">{group.members.length ? <OperationTeamAssignments team={group.members} label={`ทีมผ่าตัด · กลุ่ม ${group.id} ${group.name}`} /> : <p className="mb-0 mt-3 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-center text-xs text-muted-foreground">ยังไม่มีบุคลากรในกลุ่มนี้</p>}</div>
      </section>)}
      {ungrouped.length > 0 && <section aria-label="ตำแหน่งที่ยังไม่จัดกลุ่ม" className="min-w-0 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4"><h4 className="m-0 text-sm font-semibold">ตำแหน่งที่ยังไม่จัดกลุ่ม <span className="ml-1 text-muted-foreground">{ungrouped.length} รายการ</span></h4><p className="mb-0 mt-1 text-xs leading-5 text-muted-foreground">แสดงรายชื่อเพิ่มเติมเพื่อให้ตรวจสอบข้อมูลได้ครบ</p><OperationTeamAssignments team={ungrouped} label="ทีมผ่าตัด · ตำแหน่งที่ยังไม่จัดกลุ่ม" /></section>}
    </Tabs.Panel>
  </Tabs.Root>;
}
