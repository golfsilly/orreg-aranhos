"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { anesthesiaOptions, urgencyOptions, type Anesthesia, type MinorPeriod, type RegisterDetails, type SurgeryClass, type Urgency } from "@/lib/register/details";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const blank: RegisterDetails = { patho: false, preOp: false, postOp: false, anesthesia: null, urgency: null, surgeryClass: null, minorPeriod: null };

export function DetailsEditor({ operationId, onClose, onSaved }: { operationId: string; onClose: () => void; onSaved: (details: RegisterDetails) => void }) {
  const [details, setDetails] = useState(blank);
  const [revision, setRevision] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const formId = useId();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/details`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setDetails({ patho: data.patho, preOp: data.preOp, postOp: data.postOp, anesthesia: data.anesthesia, urgency: data.urgency, surgeryClass: data.surgeryClass, minorPeriod: data.minorPeriod });
        setRevision(data.revision);
      } catch { if (!controller.signal.aborted) setError("ไม่สามารถโหลดข้อมูลทะเบียนได้"); }
    }
    load();
    return () => controller.abort();
  }, [operationId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/details`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision, details }),
      });
      if (response.status === 409) { setError("รายการถูกแก้ไขโดยผู้ใช้อื่น โปรดปิดและเปิดรายการใหม่ก่อนบันทึก"); return; }
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRevision(data.revision); setMessage("บันทึกข้อมูลเรียบร้อยแล้ว"); onSaved(details);
    } catch { setError("ไม่สามารถบันทึกข้อมูลได้ โปรดลองอีกครั้ง"); }
    finally { setSaving(false); }
  }

  return <section className="mt-[34px] [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2_span]:ml-2 [&_h2_span]:text-[13px] [&_h2_span]:font-normal [&_h2_span]:text-[#65817c] border-t border-[#dcebe3] pt-5" aria-labelledby="details-editor-title">
    <div className="flex items-center justify-between gap-3"><h2 id="details-editor-title">บันทึกข้อมูล <span>รหัสผ่าตัด {operationId}</span></h2><Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>ปิด</Button></div>
    {revision === null && !error && <p className="leading-[1.8] text-[#65817c]">กำลังโหลด…</p>}
    {revision !== null && <form onSubmit={save}>
      <div className="flex flex-wrap gap-5">{([ ["patho", "Patho"], ["preOp", "Pre-op"], ["postOp", "Post-op"] ] as const).map(([field, name]) => <label className="mt-5 flex items-center gap-2.5 text-sm font-bold" key={field}><Checkbox checked={details[field]} onCheckedChange={(checked) => setDetails({ ...details, [field]: checked })} disabled={saving} /> {name}</label>)}</div>
      <fieldset className="mt-7 mb-1 rounded-xl border border-[#dcebe3] p-[18px]" disabled={saving}>
        <legend id={`${formId}-class`} className="px-1.5 text-sm font-bold">ประเภทผ่าตัด</legend>
        <RadioGroup<SurgeryClass | null> aria-labelledby={`${formId}-class`} name={`${formId}-class`} value={details.surgeryClass} disabled={saving} onValueChange={(value) => { if (value === "MAJOR" || value === "MINOR") setDetails({ ...details, surgeryClass: value, minorPeriod: value === "MINOR" ? details.minorPeriod : null }); }}>
          <label className="flex items-center gap-2.5 text-sm font-medium"><RadioGroupItem value="MAJOR" /> ผ่าตัดใหญ่ (Major Surgery)</label>
          <label className="flex items-center gap-2.5 text-sm font-medium"><RadioGroupItem value="MINOR" /> ผ่าตัดเล็ก (Minor Surgery)</label>
        </RadioGroup>
        {details.surgeryClass === "MINOR" && <fieldset className="mt-[18px] rounded-[10px] border-0 bg-[#f4f8f5] px-3.5 pt-2 pb-4"><legend id={`${formId}-period`} className="px-1.5 text-sm font-bold">ช่วงเวลาการผ่าตัดเล็ก</legend><RadioGroup<MinorPeriod | null> aria-labelledby={`${formId}-period`} name={`${formId}-period`} value={details.minorPeriod} disabled={saving} onValueChange={(value) => { if (value === "OFFICIAL_HOURS" || value === "OUTSIDE_HOURS") setDetails({ ...details, minorPeriod: value }); }}><label className="flex items-center gap-2.5 text-sm font-medium"><RadioGroupItem value="OFFICIAL_HOURS" /> ในเวลาราชการ</label><label className="flex items-center gap-2.5 text-sm font-medium"><RadioGroupItem value="OUTSIDE_HOURS" /> นอกเวลาราชการ</label></RadioGroup></fieldset>}
      </fieldset>
      <div className="grid grid-cols-2 gap-x-[18px] max-[600px]:grid-cols-1 [&_label]:min-w-0"><label className="mt-5 block text-sm font-bold">ชนิดการดมยา<select className="mt-2 block w-full rounded-lg border border-[#cbded4] bg-white p-[13px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]" value={details.anesthesia ?? ""} onChange={(event) => setDetails({ ...details, anesthesia: (event.target.value || null) as Anesthesia | null })} disabled={saving}><option value="">ยังไม่ระบุ</option>{anesthesiaOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label className="mt-5 block text-sm font-bold">ความเร่งด่วน<select className="mt-2 block w-full rounded-lg border border-[#cbded4] bg-white p-[13px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]" value={details.urgency ?? ""} onChange={(event) => setDetails({ ...details, urgency: (event.target.value || null) as Urgency | null })} disabled={saving}><option value="">ยังไม่ระบุ</option>{urgencyOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label></div>
      <Button type="submit" className="mt-[22px]" disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึกข้อมูล"}</Button>
    </form>}
    {error && <p className="text-sm text-[#a33a36]" role="alert">{error}</p>}{message && <p className="leading-[1.8] text-[#65817c]" role="status">{message}</p>}
  </section>;
}
