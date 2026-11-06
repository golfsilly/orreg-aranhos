"use client";

import { useEffect, useState } from "react";

type Snapshot = { fiscalYear: number; calendarMonth: number; sequence: number; operationDate: string };
type Change = { id: string; changedAt: string; before: Snapshot; after: Snapshot; changedBy: { name: string } };
const display = (item: Snapshot) => `${item.sequence}/${item.calendarMonth} · ปี ${item.fiscalYear} · วันที่ผ่าตัด ${item.operationDate}`;

export function RegisterHistory({ operationId, onClose }: { operationId: string; onClose: () => void }) {
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/history`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!Array.isArray(data.changes)) throw new Error();
        setChanges(data.changes);
      } catch { if (!controller.signal.aborted) setError("ไม่สามารถโหลดประวัติทะเบียนได้"); }
    }
    load();
    return () => controller.abort();
  }, [operationId]);

  return <section className="mt-[34px] [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2_span]:ml-2 [&_h2_span]:text-[13px] [&_h2_span]:font-normal [&_h2_span]:text-[#65817c] border-t border-[#dcebe3] pt-5" aria-labelledby="history-title"><div className="flex items-center justify-between gap-3"><h2 id="history-title">ประวัติทะเบียน <span>รหัสผ่าตัด {operationId}</span></h2><button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-[#166c5e] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose}>ปิด</button></div>{error && <p className="text-sm text-[#a33a36]" role="alert">{error}</p>}{!changes && !error && <p className="leading-[1.8] text-[#65817c]">กำลังโหลด…</p>}{changes && (changes.length === 0 ? <p className="leading-[1.8] text-[#65817c]">ยังไม่มีการเปลี่ยนวันหรือเลขทะเบียน</p> : <ul className="list-none p-0 [&_li]:flex [&_li]:flex-col [&_li]:gap-1.5 [&_li]:border-b [&_li]:border-[#e5eee8] [&_li]:py-3.5 [&_small]:text-[#65817c]">{changes.map((change) => <li key={change.id}><span>เดิม: {display(change.before)}</span><strong>ใหม่: {display(change.after)}</strong><small>{new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }).format(new Date(change.changedAt))} · {change.changedBy.name}</small></li>)}</ul>)}</section>;
}
