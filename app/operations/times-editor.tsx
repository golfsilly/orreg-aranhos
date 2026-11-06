"use client";

import { useEffect, useState, type FormEvent } from "react";
import { timeFields, type TimeField } from "@/lib/register/times";

const names: Record<TimeField, string> = {
  roomEnteredAt: "เข้าห้องผ่าตัด",
  operationStartedAt: "เริ่มผ่าตัด",
  operationEndedAt: "สิ้นสุดผ่าตัด",
  roomExitedAt: "ออกจากห้องผ่าตัด",
};
const blank: Record<TimeField, string> = { roomEnteredAt: "", operationStartedAt: "", operationEndedAt: "", roomExitedAt: "" };
const bangkokInput = (value: unknown) => typeof value === "string" ? new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16) : "";

export function TimesEditor({ operationId, onClose }: { operationId: string; onClose: () => void }) {
  const [times, setTimes] = useState(blank);
  const [revision, setRevision] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/times`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setTimes(Object.fromEntries(timeFields.map((field) => [field, bangkokInput(data[field])])) as Record<TimeField, string>);
        setRevision(data.revision);
      } catch { if (!controller.signal.aborted) setError("ไม่สามารถโหลดเวลาผ่าตัดได้"); }
    }
    load();
    return () => controller.abort();
  }, [operationId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/times`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision, times }),
      });
      if (response.status === 409) { setError("รายการถูกแก้ไขโดยผู้ใช้อื่น โปรดปิดและเปิดรายการใหม่ก่อนบันทึก"); return; }
      if (response.status === 400) { setError("โปรดตรวจสอบวันที่และลำดับเวลาเข้าห้อง เริ่มผ่าตัด สิ้นสุดผ่าตัด และออกจากห้อง"); return; }
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRevision(data.revision); setMessage("บันทึกเวลาเรียบร้อยแล้ว");
    } catch { setError("ไม่สามารถบันทึกเวลาได้ โปรดลองอีกครั้ง"); }
    finally { setSaving(false); }
  }

  return <section className="mt-[34px] [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2_span]:ml-2 [&_h2_span]:text-[13px] [&_h2_span]:font-normal [&_h2_span]:text-[#65817c] border-t border-[#dcebe3] pt-5" aria-labelledby="time-editor-title">
    <div className="flex items-center justify-between gap-3"><h2 id="time-editor-title">แก้ไขเวลา <span>รหัสผ่าตัด {operationId}</span></h2><button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-[#166c5e] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose} disabled={saving}>ปิด</button></div>
    <p className="leading-[1.8] text-[#65817c]">ระบุวันที่และเวลาท้องถิ่นประเทศไทย หากวันผ่าตัดเปลี่ยน โปรดตรวจสอบเวลาที่บันทึกไว้เดิม</p>
    {revision === null && !error && <p className="leading-[1.8] text-[#65817c]">กำลังโหลด…</p>}
    {revision !== null && <form onSubmit={save}><div className="grid grid-cols-2 gap-x-[18px] max-[600px]:grid-cols-1 [&_label]:min-w-0">{timeFields.map((field) => <label className="mt-5 block text-sm font-bold" key={field}>{names[field]}<input className="mt-2 block w-full rounded-lg border border-[#cbded4] p-[13px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]" type="datetime-local" value={times[field]} onChange={(event) => setTimes({ ...times, [field]: event.target.value })} disabled={saving} /></label>)}</div><button className="mt-[22px] inline-flex cursor-pointer items-center justify-center gap-8 rounded-[10px] border-0 bg-[#166c5e] px-5 py-[15px] font-bold text-white no-underline hover:bg-[#10584d] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50" disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึกเวลา"}</button></form>}
    {error && <p className="text-sm text-[#a33a36]" role="alert">{error}</p>}{message && <p className="leading-[1.8] text-[#65817c]" role="status">{message}</p>}
  </section>;
}
