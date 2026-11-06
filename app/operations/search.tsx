"use client";

import { useRef, useState, type FormEvent } from "react";
import { TimesEditor } from "./times-editor";
import { DetailsEditor } from "./details-editor";
import { RegisterHistory } from "./register-history";

type Row = Record<string, unknown>;
const label = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : "—";
const surgeryClassLabel = (value: unknown) => value === "MAJOR" ? "ผ่าตัดใหญ่" : value === "MINOR" ? "ผ่าตัดเล็ก" : "—";
const groupNames: Record<number, string> = { 1: "ผู้ทำการผ่าตัด", 2: "Scrub Nurse", 3: "Instrument Nurse", 4: "Circultate Nurse", 5: "Swab Count Nurse / Nurse Aid / คนงาน / พนักงานห้องผ่าตัด", 0: "ตำแหน่งอื่น" };

async function fetchRows(date: string): Promise<Row[]> {
  const response = await fetch(`/api/hosxp/operations?date=${encodeURIComponent(date)}`, { cache: "no-store" });
  if (!response.ok) throw new Error();
  const data = await response.json();
  if (!Array.isArray(data.operations)) throw new Error();
  const seen = new Set<string>();
  return data.operations.filter((row: Row) => {
    const id = label(row.operation_id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function OperationsSearch({ canSync }: { canSync: boolean }) {
  const [date, setDate] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [resultDate, setResultDate] = useState("");
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState("");
  const [editingDetails, setEditingDetails] = useState("");
  const [historyId, setHistoryId] = useState("");
  const [team, setTeam] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const teamRequest = useRef(0);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    teamRequest.current += 1;
    setTeamLoading(false); setLoading(true); setError(""); setSyncMessage("");
    setRows(null); setSelected(""); setEditing(""); setEditingDetails(""); setHistoryId(""); setTeam(null);
    try { setRows(await fetchRows(date)); setResultDate(date); }
    catch { setError("ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบการเชื่อมต่อหรือติดต่อผู้ดูแลระบบ"); }
    finally { setLoading(false); }
  }

  async function sync() {
    setSyncing(true); setError(""); setSyncMessage(""); setHistoryId("");
    try {
      const response = await fetch("/api/hosxp/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: resultDate }) });
      if (!response.ok) throw new Error();
      const result = await response.json();
      setSyncMessage(`เพิ่มใหม่ ${result.created} · ออกเลขใหม่ ${result.renumbered} · เปลี่ยนวันในเดือนเดิม ${result.dateUpdated} · ไม่เปลี่ยนแปลง ${result.existing} รายการ`);
      try { setRows(await fetchRows(resultDate)); }
      catch { setError("ซิงก์สำเร็จ แต่ไม่สามารถปรับปรุงผลค้นหาได้ โปรดค้นหาอีกครั้ง"); }
    } catch { setError("ไม่สามารถซิงก์ได้ โปรดตรวจสอบการเชื่อมต่อหรือติดต่อผู้ดูแลระบบ"); }
    finally { setSyncing(false); }
  }

  async function showTeam(id: string) {
    const requestId = ++teamRequest.current;
    setSelected(id); setTeam(null); setError(""); setTeamLoading(true);
    try {
      const response = await fetch(`/api/hosxp/operations/${encodeURIComponent(id)}/team`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!Array.isArray(data.team)) throw new Error();
      if (teamRequest.current === requestId) setTeam(data.team);
    } catch { if (teamRequest.current === requestId) setError("ไม่สามารถดึงข้อมูลทีมผ่าตัดได้"); }
    finally { if (teamRequest.current === requestId) setTeamLoading(false); }
  }

  return <section className="mb-[30px] rounded-[18px] border border-[#dcebe3] bg-white p-7">
    <form onSubmit={search} className="flex flex-wrap items-end gap-3 [&_label]:m-0 [&_label]:min-w-[220px] [&_button]:m-0 [&_a]:m-0">
      <label className="mt-5 block text-sm font-bold">วันที่ผ่าตัด<input className="mt-2 block w-full rounded-lg border border-[#cbded4] p-[13px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]" type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={loading || syncing} required /></label>
      <button className="mt-[22px] inline-flex cursor-pointer items-center justify-center gap-8 rounded-[10px] border-0 bg-[#166c5e] px-5 py-[15px] font-bold text-white no-underline hover:bg-[#10584d] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50" disabled={loading || syncing}>{loading ? "กำลังค้นหา…" : "ค้นหา"}</button>
    </form>
    {error && <p className="text-sm text-[#a33a36]" role="alert">{error}</p>}
    {rows && <div className="mt-[34px] [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2_span]:ml-2 [&_h2_span]:text-[13px] [&_h2_span]:font-normal [&_h2_span]:text-[#65817c]">
      <h2>ผลการค้นหา <span>{resultDate} · {rows.length} รายการ</span></h2>
      {rows.length === 0 ? <p className="leading-[1.8] text-[#65817c]">ไม่พบรายการในวันที่เลือก</p> : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead><tr><th className="border-b border-[#e5eee8] px-2.5 py-3.5 font-semibold text-[#6a817a]">เลขทะเบียน</th><th className="border-b border-[#e5eee8] px-2.5 py-3.5 font-semibold text-[#6a817a]">รหัสผ่าตัด</th><th className="border-b border-[#e5eee8] px-2.5 py-3.5 font-semibold text-[#6a817a]">HN</th><th className="border-b border-[#e5eee8] px-2.5 py-3.5 font-semibold text-[#6a817a]">ชื่อผู้ป่วย</th><th className="border-b border-[#e5eee8] px-2.5 py-3.5 font-semibold text-[#6a817a]">ประเภทผ่าตัด</th><th className="border-b border-[#e5eee8] px-2.5 py-3.5 font-semibold text-[#6a817a]">ความเร่งด่วน</th><th className="border-b border-[#e5eee8] px-2.5 py-3.5 font-semibold text-[#6a817a]">สถานะ</th><th className="border-b border-[#e5eee8] px-2.5 py-3.5 font-semibold text-[#6a817a]">การดำเนินการ</th></tr></thead>
          <tbody>{rows.map((row, index) => {
            const id = label(row.operation_id);
            return <tr key={`${id}-${index}`}><td className="border-b border-[#e5eee8] px-2.5 py-3.5">{row.needsDateSync ? <>เลขเดิม {label(row.registerNumber)}<br /><span className="text-xs text-[#9b5c16]">วันที่เปลี่ยน กรุณาซิงก์</span></> : label(row.registerNumber)}</td><td className="border-b border-[#e5eee8] px-2.5 py-3.5">{id}</td><td className="border-b border-[#e5eee8] px-2.5 py-3.5">{label(row.hn)}</td><td className="border-b border-[#e5eee8] px-2.5 py-3.5">{label(row.ptname)}</td><td className="border-b border-[#e5eee8] px-2.5 py-3.5">{surgeryClassLabel(row.surgeryClass)}</td><td className="border-b border-[#e5eee8] px-2.5 py-3.5">{label(row.registerNumber != null ? row.registerUrgency : row.emergency_name)}</td><td className="border-b border-[#e5eee8] px-2.5 py-3.5">{label(row.status_name)}</td><td className="flex gap-3 whitespace-nowrap border-b border-[#e5eee8] px-2.5 py-3.5"><button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-[#166c5e] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => showTeam(id)} disabled={teamLoading || id === "—"}>ดูทีม</button>{row.registerNumber != null && <button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-[#166c5e] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setHistoryId(id)}>ประวัติเลข</button>}{canSync && row.registerNumber != null && !row.needsDateSync && <><button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-[#166c5e] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => { setEditingDetails(""); setEditing(id); }}>แก้ไขเวลา</button><button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-[#166c5e] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => { setEditing(""); setEditingDetails(id); }}>ข้อมูล</button></>}</td></tr>;
          })}</tbody>
        </table></div>
        {canSync && <button type="button" className="mt-[22px] inline-flex cursor-pointer items-center justify-center gap-8 rounded-[10px] border-0 bg-[#166c5e] px-5 py-[15px] font-bold text-white no-underline hover:bg-[#10584d] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50" onClick={sync} disabled={syncing || loading}>{syncing ? "กำลังซิงก์…" : "ซิงก์เข้าทะเบียน"}</button>}
        <p className="leading-[1.8] text-[#65817c]" role="status">{syncMessage}</p>
      </>}
    </div>}
    {selected && <div className="mt-[34px] [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2_span]:ml-2 [&_h2_span]:text-[13px] [&_h2_span]:font-normal [&_h2_span]:text-[#65817c]"><h2>Operation และทีมผ่าตัด <span>รหัส {selected}</span></h2>{teamLoading ? <p className="leading-[1.8] text-[#65817c]">กำลังโหลด…</p> : team && (team.length === 0 ? <p className="leading-[1.8] text-[#65817c]">ไม่พบข้อมูลทีมผ่าตัด</p> : <><p className="leading-[1.8] text-[#65817c]">Operation: {[...new Set(team.map((row) => label(row.operation_item_name)).filter((name) => name !== "—"))].join(", ") || "—"}</p>{[1, 2, 3, 4, 5, 0].map((group) => { const members = team.filter((row) => (typeof row.personnelGroup === "number" ? row.personnelGroup : 0) === group); return members.length ? <div key={group}><h3 className="font-semibold">{group ? `กลุ่ม ${group} · ${groupNames[group]}` : groupNames[group]}</h3><ul className="list-none p-0 [&_li]:flex [&_li]:flex-wrap [&_li]:gap-x-5 [&_li]:gap-y-1.5 [&_li]:border-b [&_li]:border-[#e5eee8] [&_li]:py-3 [&_li_span]:text-[#65817c]">{members.map((row, index) => <li key={index}><strong>{label(row.doctor_name)}</strong><span>{label(row.position_name)} · {label(row.operation_item_name)}</span></li>)}</ul></div> : null; })}</>)}</div>}
    {editing && <TimesEditor key={editing} operationId={editing} onClose={() => setEditing("")} />}
    {editingDetails && <DetailsEditor key={editingDetails} operationId={editingDetails} onClose={() => setEditingDetails("")} onSaved={(details) => setRows((current) => current?.map((row) => label(row.operation_id) === editingDetails ? { ...row, registerUrgency: details.urgency, surgeryClass: details.surgeryClass } : row) ?? null)} />}
    {historyId && <RegisterHistory key={historyId} operationId={historyId} onClose={() => setHistoryId("")} />}
  </section>;
}
