"use client";

import { useQuery } from "@tanstack/react-query";
import { HistorySkeleton } from "./operations-skeleton";

type Snapshot = { fiscalYear: number; calendarMonth: number; sequence: number; operationDate: string };
type Change = { id: string; changedAt: string; before: Snapshot; after: Snapshot; changedBy: { name: string } };
const display = (item: Snapshot) => `${item.sequence}/${item.calendarMonth} · ปี ${item.fiscalYear} · วันที่ผ่าตัด ${item.operationDate}`;

export function RegisterHistory({ operationId, onClose }: { operationId: string; onClose: () => void }) {
  const query = useQuery({ queryKey: ["register-history", operationId], queryFn: async ({ signal }): Promise<Change[]> => {
    const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/history`, { cache: "no-store", signal });
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (!Array.isArray(data.changes)) throw new Error();
    return data.changes;
  } });
  const changes = query.data ?? null;
  const error = query.isError ? "ไม่สามารถโหลดประวัติทะเบียนได้" : "";

  return <section className="mt-[34px] [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2_span]:ml-2 [&_h2_span]:text-[13px] [&_h2_span]:font-normal [&_h2_span]:text-muted-foreground border-t border-border pt-5" aria-labelledby="history-title"><div className="flex items-center justify-between gap-3"><h2 id="history-title">ประวัติทะเบียน <span>รหัสผ่าตัด {operationId}</span></h2><button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose}>ปิด</button></div>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}{!changes && !error && <HistorySkeleton />}{changes && (changes.length === 0 ? <p className="leading-[1.8] text-muted-foreground">ยังไม่มีการเปลี่ยนวันหรือเลขทะเบียน</p> : <ul className="list-none p-0 [&_li]:flex [&_li]:flex-col [&_li]:gap-1.5 [&_li]:border-b [&_li]:border-border [&_li]:py-3.5 [&_small]:text-muted-foreground">{changes.map((change) => <li key={change.id}><span>เดิม: {display(change.before)}</span><strong>ใหม่: {display(change.after)}</strong><small>{new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }).format(new Date(change.changedAt))} · {change.changedBy.name}</small></li>)}</ul>)}</section>;
}
