"use client";

import { useEffect, useId, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { anesthesiaOptions, urgencyOptions, registerDetailsSchema, type Anesthesia, type MinorPeriod, type RegisterDetails, type SurgeryClass, type Urgency } from "@/lib/register/details";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { EditorSkeleton } from "./operations-skeleton";

const blank: RegisterDetails = { patho: false, preOp: false, postOp: false, anesthesia: null, urgency: null, surgeryClass: null, minorPeriod: null };

export function DetailsEditor({ operationId, onClose, onSaved }: { operationId: string; onClose: () => void; onSaved: (details: RegisterDetails) => void }) {
  const form = useForm<RegisterDetails>({ resolver: zodResolver(registerDetailsSchema), defaultValues: blank });
  const details = useWatch({ control: form.control }) as RegisterDetails;
  const setDetails = (next: RegisterDetails) => { for (const key of Object.keys(next) as (keyof RegisterDetails)[]) form.setValue(key, next[key] as never, { shouldDirty: true }); };
  const { reset } = form;
  const [savedRevision, setSavedRevision] = useState<number | null>(null);
  const [error, setError] = useState("");
  const formId = useId();
  const query = useQuery({ queryKey: ["register-details", operationId], queryFn: async ({ signal }) => {
    const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/details`, { cache: "no-store", signal });
    if (!response.ok) throw new Error();
    return response.json() as Promise<RegisterDetails & { revision: number }>;
  } });
  const revision = savedRevision ?? query.data?.revision ?? null;
  useEffect(() => {
    if (!query.data) return;
    const { revision: _revision, ...loadedDetails } = query.data;
    void _revision;
    reset(loadedDetails);
  }, [query.data, reset]);
  const mutation = useMutation({ mutationFn: async (values: RegisterDetails) => {
      const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/details`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision, details: values }),
      });
      if (response.status === 409) throw new Error("รายการถูกแก้ไขโดยผู้ใช้อื่น โปรดปิดและเปิดรายการใหม่ก่อนบันทึก");
      if (!response.ok) throw new Error("ไม่สามารถบันทึกข้อมูลได้ โปรดลองอีกครั้ง");
      return response.json() as Promise<{ revision: number }>;
  }, onSuccess: (data, values) => { setSavedRevision(data.revision); toast.success("บันทึกข้อมูลเรียบร้อยแล้ว"); onSaved(values); } });
  async function save(values: RegisterDetails) {
    setError("");
    try { await mutation.mutateAsync(values); } catch (cause) { setError(cause instanceof Error ? cause.message : "ไม่สามารถบันทึกข้อมูลได้"); }
  }
  const saving = mutation.isPending;

  return <section className="mt-[34px] [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2_span]:ml-2 [&_h2_span]:text-[13px] [&_h2_span]:font-normal [&_h2_span]:text-muted-foreground border-t border-border pt-5" aria-labelledby="details-editor-title">
    <div className="flex items-center justify-between gap-3"><h2 id="details-editor-title">บันทึกข้อมูล <span>รหัสผ่าตัด {operationId}</span></h2><Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>ปิด</Button></div>
    {query.isLoading && <EditorSkeleton details />}
    {revision !== null && <form onSubmit={form.handleSubmit(save)}>
      <div className="flex flex-wrap gap-5">{([ ["patho", "Patho"], ["preOp", "Pre-op"], ["postOp", "Post-op"] ] as const).map(([field, name]) => <label className="mt-5 flex items-center gap-2.5 text-sm font-bold" key={field}><Checkbox checked={details[field]} onCheckedChange={(checked) => setDetails({ ...details, [field]: checked })} disabled={saving} /> {name}</label>)}</div>
      <fieldset className="mt-7 mb-1 rounded-xl border border-border p-[18px]" disabled={saving}>
        <legend id={`${formId}-class`} className="px-1.5 text-sm font-bold">ประเภทผ่าตัด</legend>
        <RadioGroup<SurgeryClass | null> aria-labelledby={`${formId}-class`} name={`${formId}-class`} value={details.surgeryClass} disabled={saving} onValueChange={(value) => { if (value === "MAJOR" || value === "MINOR") setDetails({ ...details, surgeryClass: value, minorPeriod: value === "MINOR" ? details.minorPeriod : null }); }}>
          <label className="flex items-center gap-2.5 text-sm font-medium"><RadioGroupItem value="MAJOR" /> ผ่าตัดใหญ่ (Major Surgery)</label>
          <label className="flex items-center gap-2.5 text-sm font-medium"><RadioGroupItem value="MINOR" /> ผ่าตัดเล็ก (Minor Surgery)</label>
        </RadioGroup>
        {details.surgeryClass === "MINOR" && <fieldset className="mt-[18px] rounded-[10px] border-0 bg-muted px-3.5 pt-2 pb-4"><legend id={`${formId}-period`} className="px-1.5 text-sm font-bold">ช่วงเวลาการผ่าตัดเล็ก</legend><RadioGroup<MinorPeriod | null> aria-labelledby={`${formId}-period`} name={`${formId}-period`} value={details.minorPeriod} disabled={saving} onValueChange={(value) => { if (value === "OFFICIAL_HOURS" || value === "OUTSIDE_HOURS") setDetails({ ...details, minorPeriod: value }); }}><label className="flex items-center gap-2.5 text-sm font-medium"><RadioGroupItem value="OFFICIAL_HOURS" /> ในเวลาราชการ</label><label className="flex items-center gap-2.5 text-sm font-medium"><RadioGroupItem value="OUTSIDE_HOURS" /> นอกเวลาราชการ</label></RadioGroup></fieldset>}
      </fieldset>
      <div className="grid grid-cols-2 gap-x-[18px] max-[600px]:grid-cols-1 [&_label]:min-w-0"><label className="mt-5 block text-sm font-bold">ชนิดการดมยา<select className="mt-2 block w-full rounded-lg border border-input bg-card p-[13px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring" value={details.anesthesia ?? ""} onChange={(event) => setDetails({ ...details, anesthesia: (event.target.value || null) as Anesthesia | null })} disabled={saving}><option value="">ยังไม่ระบุ</option>{anesthesiaOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label className="mt-5 block text-sm font-bold">ความเร่งด่วน<select className="mt-2 block w-full rounded-lg border border-input bg-card p-[13px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring" value={details.urgency ?? ""} onChange={(event) => setDetails({ ...details, urgency: (event.target.value || null) as Urgency | null })} disabled={saving}><option value="">ยังไม่ระบุ</option>{urgencyOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label></div>
      <Button type="submit" className="mt-[22px]" disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึกข้อมูล"}</Button>
    </form>}
    {(error || query.isError || form.formState.errors.minorPeriod) && <p className="text-sm text-destructive" role="alert">{error || form.formState.errors.minorPeriod?.message || "ไม่สามารถโหลดข้อมูลทะเบียนได้"}</p>}
  </section>;
}
