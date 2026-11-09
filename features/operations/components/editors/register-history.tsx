"use client";

import { useQuery } from "@tanstack/react-query";
import { AppDialog } from "@/components/ui/app-dialog";
import { HistorySkeleton } from "../shared/operations-skeleton";

type Snapshot = { fiscalYear: number; calendarMonth: number; departmentName?: string; sequence: number; operationDate: string };
type Change = { id: string; changedAt: string; before: Snapshot; after: Snapshot; changedBy: { name: string } };
const dateTime = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
function describe(item: Snapshot) {
  return [item.departmentName, `${item.sequence}/${item.calendarMonth}`, `ปีงบประมาณ ${item.fiscalYear}`, `วันที่ผ่าตัด ${item.operationDate}`].filter(Boolean).join(" · ");
}

export function RegisterHistory({ operationId, onClose }: { operationId: string; onClose: () => void }) {
  const query = useQuery({
    queryKey: ["register-history", operationId],
    queryFn: async ({ signal }): Promise<Change[]> => {
      const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/history`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("โหลดประวัติทะเบียนไม่สำเร็จ");
      const data = await response.json();
      if (!Array.isArray(data.changes)) throw new Error("รูปแบบข้อมูลประวัติไม่ถูกต้อง");
      return data.changes;
    },
  });

  return <AppDialog open onOpenChange={(open) => { if (!open) onClose(); }} title="ประวัติทะเบียน" description={`ประวัติการเปลี่ยนเลขและวันผ่าตัด · ${operationId}`}>
    {query.isLoading && <HistorySkeleton />}
    {query.isError && <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">โหลดประวัติไม่สำเร็จ กรุณาปิดแล้วเปิดใหม่</p>}
    {query.data && (query.data.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-10 text-center">
      <p className="font-medium">ยังไม่มีการเปลี่ยนแปลงทะเบียน</p><p className="mt-1 text-sm text-muted-foreground">ระบบจะแสดงประวัติเมื่อวันผ่าตัดหรือเลขทะเบียนเปลี่ยน</p>
    </div> : <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px before:bg-border">
      {query.data.map((change) => <li key={change.id} className="relative pl-7">
        <span className="absolute top-1.5 left-0 size-[15px] rounded-full border-[3px] border-primary bg-background" />
        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-semibold">เปลี่ยนข้อมูลทะเบียน</p><time className="text-xs text-muted-foreground" dateTime={change.changedAt}>{dateTime.format(new Date(change.changedAt))}</time></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/60 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ข้อมูลเดิม</p><p className="mt-1.5 text-sm leading-6">{describe(change.before)}</p></div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-primary">ข้อมูลใหม่</p><p className="mt-1.5 text-sm leading-6">{describe(change.after)}</p></div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">ดำเนินการโดย {change.changedBy.name}</p>
        </article>
      </li>)}
    </ol>)}
  </AppDialog>;
}
